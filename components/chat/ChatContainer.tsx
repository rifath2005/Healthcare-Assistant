"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageBubble, type Citation } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { CrisisBanner } from "./CrisisBanner";
import { SentimentIndicator } from "./SentimentIndicator";
import { BreathingExercise } from "@/components/wellness/BreathingExercise";
import { GroundingWidget } from "@/components/wellness/GroundingWidget";
import { BookingModal } from "@/components/appointment/BookingModal";
import { ExportSummaryModal } from "./ExportSummaryModal";
import {
  getGuestMessages,
  setGuestMessages,
  type GuestMessage,
} from "@/lib/supabase/syncGuestSession";
import { createClient } from "@/lib/supabase/client";
import { HeartPulse, Sparkles, Download, Menu } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface ChatContainerProps {
  conversationId?: string | null;
  onToggleSidebar?: () => void;
}

const SUGGESTION_CHIPS = [
  "I have had a dull headache for 2 days",
  "Feeling overwhelmed with stress and anxiety",
  "Book a consultation with a doctor",
  "What are the warning signs of a heart attack?",
];

export function ChatContainer({
  conversationId,
  onToggleSidebar,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Hello! I am your Smart Healthcare Assistant. You can ask me health and wellness questions, describe any symptoms you are experiencing, or practice guided breathing and grounding exercises.\n\n*Reminder: I provide evidence-grounded health literacy, not certified clinical diagnoses.*",
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [crisisState, setCrisisState] = useState<{
    triggered: boolean;
    severity?: string;
    trigger?: string;
  }>({ triggered: false });

  const [detectedMood, setDetectedMood] = useState<string>("neutral");
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, crisisState]);

  // Load past conversation messages from Supabase or localStorage
  useEffect(() => {
    let isMounted = true;

    async function loadThread() {
      if (conversationId) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("messages")
            .select("id, role, content, metadata, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0 && isMounted) {
            setMessages(
              data.map((m) => ({
                id: m.id,
                role: m.role as any,
                content: m.content,
                citations: (m.metadata as any)?.citations || [],
                created_at: m.created_at,
              }))
            );
          }
        } catch (e) {
          console.warn("Failed to load thread messages:", e);
        }
      } else {
        // Guest mode fallback
        const guestMsgs = getGuestMessages();
        if (guestMsgs.length > 0 && isMounted) {
          setMessages(guestMsgs as Message[]);
        }
      }
    }

    loadThread();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 1. Append user message
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    // Save to local guest storage if unauthenticated
    if (!conversationId) {
      setGuestMessages(nextMessages as GuestMessage[]);
    }

    // 2. Trigger asynchronous NLP extraction for mood detection
    fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((entities) => {
        if (entities.mood) setDetectedMood(entities.mood);
      })
      .catch((err) => console.warn("Extraction non-blocking error:", err));

    // 3. Initiate Streaming Chat Response
    abortControllerRef.current = new AbortController();

    try {
      const isEmpatheticMode = ["anxious", "depressed", "stressed", "overwhelmed"].includes(
        detectedMood.toLowerCase()
      );

      // Filter out client-side welcome UI placeholder so history begins with user turn
      const payloadMessages = nextMessages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          conversationId,
          isEmpathetic: isEmpatheticMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to communicate with healthcare assistant");
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error("No readable stream received");
      }

      // Placeholder assistant message to stream into
      const assistantMsgId = `ast_${Date.now()}`;
      let accumulatedText = "";
      let incomingCitations: Citation[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          citations: [],
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "CRISIS_TRIGGERED") {
              setCrisisState({
                triggered: true,
                severity: data.severity,
                trigger: data.trigger,
              });
              setIsLoading(false);
              return;
            } else if (data.type === "CITATIONS") {
              incomingCitations = data.citations;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, citations: incomingCitations } : m
                )
              );
            } else if (data.type === "TOKEN") {
              accumulatedText += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );
            } else if (data.type === "DONE") {
              setIsLoading(false);
            }
          } catch {
            // Ignore malformed chunk
          }
        }
      }

      // Finalize messages update
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: accumulatedText, citations: incomingCitations }
            : m
        );
        if (!conversationId) {
          setGuestMessages(updated as GuestMessage[]);
        }
        return updated;
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat stream aborted by user.");
      } else {
        console.error("Chat streaming error:", err);
        toast.error("Stream connection error. Please retry.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 relative">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Healthcare AI Companion
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Grounding via Gemini 1.5 & Supabase pgvector
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
            title="Export consultation summary"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Crisis Banner if safety gate was hit */}
        {crisisState.triggered && (
          <CrisisBanner
            severity={crisisState.severity}
            trigger={crisisState.trigger}
          />
        )}

        {/* Breathing Exercise Drawer */}
        {showBreathing && (
          <BreathingExercise onClose={() => setShowBreathing(false)} />
        )}

        {/* Grounding Exercise Drawer */}
        {showGrounding && (
          <GroundingWidget onClose={() => setShowGrounding(false)} />
        )}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id || idx}
            id={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            onOpenBookingModal={() => setShowBooking(true)}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 p-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>Consulting medical knowledge base...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(chip)}
              className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Footer Area: Sentiment badge + Chat Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <SentimentIndicator
          mood={detectedMood}
          onOpenBreathing={() => setShowBreathing(true)}
          onOpenGrounding={() => setShowGrounding(true)}
        />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Appointment Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
      />

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        messages={messages}
      />
    </div>
  );
}
