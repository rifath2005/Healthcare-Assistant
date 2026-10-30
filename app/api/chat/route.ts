import { NextRequest, NextResponse } from "next/server";
import {
  evaluateCrisisSafety,
  CRISIS_RESOURCES,
  evaluateDomainScope,
  OUT_OF_SCOPE_REFUSAL,
  INJECTION_REFUSAL,
} from "@/lib/safety";
import { searchSimilarDocuments } from "@/lib/vectorStore";
import { getChatModel, FALLBACK_MODELS } from "@/lib/gemini";
import {
  sanitizeUserPrompt,
  formatDefensivePrompt,
  detectPromptInjection,
} from "@/lib/sanitizer";
import { checkRateLimit } from "@/lib/ratelimit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordGeminiUsage } from "@/lib/telemetry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = await checkRateLimit(`chat_${ip}`, 20, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before sending another message." },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.reset.toString(),
            "X-RateLimit-Limit": rateCheck.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { messages, conversationId, isEmpathetic, isVoiceMode } = body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty 'messages' array" },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || !latestMessage.content || typeof latestMessage.content !== "string") {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const rawInput = latestMessage.content;
    const sanitizedInput = sanitizeUserPrompt(rawInput);

    // Helper to stream text response directly as Server-Sent Events (SSE)
    const streamTextResponse = (content: string) => {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "TOKEN", content })}\n\n`)
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "DONE" })}\n\n`)
            );
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    };

    // 3a. Security Guardrail: Prompt Injection & Adversarial Jailbreak Defense
    const injectionCheck = detectPromptInjection(sanitizedInput);
    if (injectionCheck.isInjection) {
      return streamTextResponse(INJECTION_REFUSAL);
    }

    // 3b. Pre-execution Clinical Crisis Gate
    const crisisCheck = evaluateCrisisSafety(sanitizedInput);
    if (crisisCheck.isCrisis) {
      // Asynchronously log incident to crisis_logs table
      try {
        const supabase = createServerSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("crisis_logs").insert({
          user_id: user?.id || null,
          trigger_text: sanitizedInput,
          detected_severity: crisisCheck.severity,
          reviewed: false,
        });
      } catch (logErr) {
        console.error("Crisis logging error:", logErr);
      }

      // Stream structured CRISIS_TRIGGERED event payload immediately
      const crisisPayload = JSON.stringify({
        type: "CRISIS_TRIGGERED",
        severity: crisisCheck.severity,
        trigger: crisisCheck.triggerMatched,
        resources: CRISIS_RESOURCES,
      });

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(`data: ${crisisPayload}\n\n`));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    }

    // 3c. Healthcare Domain Scope Gate (Reject out-of-scope non-medical queries)
    const domainCheck = evaluateDomainScope(sanitizedInput);
    if (!domainCheck.isAllowed) {
      return streamTextResponse(domainCheck.refusalMessage || OUT_OF_SCOPE_REFUSAL);
    }

    // 4. Query RAG Knowledge Base
    const matchedDocs = await searchSimilarDocuments(sanitizedInput, 3, 0.72);
    let contextPassage = "";
    const citations: Array<{ index: number; title: string; source_url?: string; excerpt: string }> = [];

    if (matchedDocs.length > 0) {
      contextPassage = matchedDocs
        .map((doc, idx) => {
          const num = idx + 1;
          citations.push({
            index: num,
            title: doc.title,
            source_url: doc.source_url,
            excerpt: doc.content.slice(0, 160) + "...",
          });
          return `Medical Reference (${doc.title}): ${doc.content}`;
        })
        .join("\n\n");
    }

    // 5. Construct Defensive Grounded Prompt
    const defensivePrompt = formatDefensivePrompt(sanitizedInput, contextPassage);

    // 6. Check user session for persistence
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Auto-create conversation thread if user is authenticated and conversationId was not provided
    let activeConversationId = conversationId;
    if (user && !activeConversationId) {
      try {
        const title =
          rawInput.trim().slice(0, 40) + (rawInput.trim().length > 40 ? "..." : "");
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: title || "New Consultation",
          })
          .select("id")
          .single();

        if (newConv?.id) {
          activeConversationId = newConv.id;
        }
      } catch (convErr) {
        console.error("Auto-create conversation error:", convErr);
      }
    }

    // 7. Invoke Gemini Streaming Generation
    recordGeminiUsage(350);

    // Format historical messages for multi-turn Gemini chat
    // Gemini rules:
    // 1. History must start with a 'user' turn (cannot start with 'model'/assistant).
    // 2. Roles must strictly alternate: 'user' -> 'model' -> 'user' -> 'model'.
    // 3. parts[].text must be non-empty strings.
    const rawHistory = messages.slice(0, -1);
    const validHistory: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

    // Find the first user message in history (Gemini history MUST start with role: 'user')
    const firstUserIndex = rawHistory.findIndex((m: any) => m.role === "user");

    if (firstUserIndex !== -1) {
      let expectedRole: "user" | "model" = "user";

      for (let i = firstUserIndex; i < rawHistory.length; i++) {
        const item = rawHistory[i];
        const role = item.role === "assistant" ? "model" : "user";
        const contentText = sanitizeUserPrompt(item.content || "").trim();
        if (!contentText) continue;

        if (role === expectedRole) {
          validHistory.push({
            role,
            parts: [{ text: contentText }],
          });
          expectedRole = expectedRole === "user" ? "model" : "user";
        } else if (validHistory.length > 0) {
          // Merge consecutive messages with the same role
          const prev = validHistory[validHistory.length - 1];
          prev.parts[0].text += `\n\n${contentText}`;
        }
      }

      // History must end with 'model' so the next turn (defensivePrompt from user) alternates properly
      if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === "user") {
        validHistory.pop();
      }
    }

    let result: any = null;
    let lastError: any = null;
    const modelsToTry =
      Array.isArray(FALLBACK_MODELS) && FALLBACK_MODELS.length > 0
        ? FALLBACK_MODELS
        : ["gemini-3.1-flash-lite"];

    for (const candidateModel of modelsToTry) {
      try {
        const model = getChatModel({ isEmpathetic, isVoiceMode, modelName: candidateModel });

        try {
          const chatSession = model.startChat({ history: validHistory });
          result = await chatSession.sendMessageStream(defensivePrompt);
        } catch (chatError: any) {
          console.warn(`startChat on ${candidateModel} failed, trying generateContentStream:`, chatError?.message);
          result = await model.generateContentStream(defensivePrompt);
        }

        if (result && result.stream) {
          break; // Successfully initiated streaming session
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${candidateModel} failed, trying next candidate:`, err?.message);
      }
    }

    if (!result || !result.stream) {
      const isQuota =
        lastError?.status === 429 ||
        lastError?.message?.includes("quota") ||
        lastError?.message?.includes("429");

      return NextResponse.json(
        {
          error: isQuota
            ? "The clinical assistant is currently experiencing high demand. Please try again in a few moments."
            : "Unable to generate healthcare response. Please try again in a moment.",
        },
        { status: isQuota ? 429 : 500 }
      );
    }

    // 8. Stream Response to Client via Server-Sent Events (SSE)
    let accumulatedContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // If conversationId is active, notify client
        if (activeConversationId) {
          const convEvent = JSON.stringify({
            type: "CONVERSATION_ID",
            conversationId: activeConversationId,
          });
          controller.enqueue(encoder.encode(`data: ${convEvent}\n\n`));
        }

        // If citations were found, emit them as the next event
        if (citations.length > 0) {
          const citationEvent = JSON.stringify({ type: "CITATIONS", citations });
          controller.enqueue(encoder.encode(`data: ${citationEvent}\n\n`));
        }

        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              accumulatedContent += chunkText;
              const textEvent = JSON.stringify({ type: "TOKEN", content: chunkText });
              controller.enqueue(encoder.encode(`data: ${textEvent}\n\n`));
            }
          }

          // Emit DONE event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "DONE" })}\n\n`));

          // 9. Persist messages to Supabase if authenticated and activeConversationId exists
          if (user && activeConversationId) {
            try {
              await supabase.from("messages").insert([
                {
                  conversation_id: activeConversationId,
                  role: "user",
                  content: rawInput,
                },
                {
                  conversation_id: activeConversationId,
                  role: "assistant",
                  content: accumulatedContent,
                  metadata: { citations },
                },
              ]);

              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", activeConversationId);
            } catch (persistErr) {
              console.error("Failed to persist conversation turns:", persistErr);
            }
          }

          controller.close();
        } catch (streamError) {
          console.error("Streaming error:", streamError);
          const errorEvent = JSON.stringify({
            type: "ERROR",
            error: "An error occurred while streaming the medical response.",
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error in Chat Pipeline" },
      { status: 500 }
    );
  }
}
