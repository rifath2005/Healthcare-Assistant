"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
  clearGuestMessages,
  type GuestMessage,
} from "@/lib/supabase/syncGuestSession";
import { createClient } from "@/lib/supabase/client";
import { HeartPulse, Sparkles, Download, Menu, Plus, History, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface ChatContainerProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
}

const INITIAL_WELCOME_MESSAGE: Message = {
  id: "welcome-msg",
  role: "assistant",
  content:
    "Hello! I am your Smart Healthcare Assistant. You can ask me health and wellness questions, describe symptoms you are experiencing, learn about medical conditions and preventive care, or practice guided breathing exercises.\n\n*Reminder: I provide evidence-grounded health literacy and guidance, not formal clinical diagnoses or prescription medication.*",
  created_at: new Date().toISOString(),
};

const SUGGESTION_CHIPS = [
  "I have had a dull headache for 2 days",
  "What are the warning signs of a heart attack?",
  "Feeling overwhelmed with stress and anxiety",
  "How do I schedule an appointment with a clinic doctor?",
];

export function ChatContainer({
  conversationId,
  onConversationCreated,
  onNewConversation,
  onToggleSidebar,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MESSAGE]);
  const currentConvIdRef = useRef<string | null>(conversationId || null);

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
  const [bookingMode, setBookingMode] = useState<"virtual" | "direct">("virtual");
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

    // Prevent re-fetching and wiping live chat if conversationId was just assigned during streaming
    if (conversationId && conversationId === currentConvIdRef.current && messages.length > 1) {
      return;
    }
    currentConvIdRef.current = conversationId || null;

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
            setCrisisState({ triggered: false });
            return;
          }
        } catch (e) {
          console.warn("Failed to load thread messages:", e);
        }
      }

      // Guest mode fallback or pristine initial reset
      if (isMounted) {
        const guestMsgs = getGuestMessages();
        if (guestMsgs.length > 0 && !conversationId) {
          setMessages(guestMsgs as Message[]);
        } else {
          setMessages([INITIAL_WELCOME_MESSAGE]);
        }
        setCrisisState({ triggered: false });
      }
    }

    loadThread();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const freshWelcome: Message = {
      id: `welcome-msg-${Date.now()}`,
      role: "assistant",
      content: INITIAL_WELCOME_MESSAGE.content,
      created_at: new Date().toISOString(),
    };
    setMessages([freshWelcome]);
    clearGuestMessages();
    setCrisisState({ triggered: false });
    setIsLoading(false);
    setDetectedMood("neutral");
    if (conversationId && onNewConversation) {
      onNewConversation();
    }
    toast.success("Chat history cleared");
  };

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
    let assistantMsgId = "";
    let accumulatedText = "";

    try {
      const isEmpatheticMode = ["anxious", "depressed", "stressed", "overwhelmed"].includes(
        detectedMood.toLowerCase()
      );

      // Filter out client-side welcome UI placeholder so history begins with user turn
      const payloadMessages = nextMessages
        .filter((m) => m.id !== "welcome-msg" && !m.id?.startsWith("welcome-msg-"))
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
        let errorMsg = "Unable to reach healthcare assistant. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch {}
        toast.error(errorMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: `ast_err_${Date.now()}`,
            role: "assistant",
            content: `I apologize, but I encountered an issue: ${errorMsg}\n\nPlease try again shortly, or consult our clinic doctors if you require immediate medical assistance.`,
            created_at: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error("No readable stream received");
      }

      // Placeholder assistant message to stream into
      assistantMsgId = `ast_${Date.now()}`;
      accumulatedText = "";
      let incomingCitations: Citation[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          citations: [],
          created_at: new Date().toISOString(),
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

            if (data.type === "CONVERSATION_ID") {
              if (data.conversationId) {
                currentConvIdRef.current = data.conversationId;
                onConversationCreated?.(data.conversationId);
              }
            } else if (data.type === "CRISIS_TRIGGERED") {
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
            } else if (data.type === "ERROR") {
              const errMsg = data.error || "An error occurred while streaming the medical response.";
              accumulatedText = accumulatedText
                ? `${accumulatedText}\n\n*(Notice: ${errMsg})*`
                : `I apologize, but an error occurred while generating the response: ${errMsg}`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );
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
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) {
            return prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      accumulatedText ||
                      "I'm sorry, the connection was interrupted before I could complete my response. Please send your message again.",
                  }
                : m
            );
          }
          return [
            ...prev,
            {
              id: `ast_err_${Date.now()}`,
              role: "assistant",
              content:
                "I apologize, but a connection error occurred while contacting the assistant. Please try sending your message again.",
              created_at: new Date().toISOString(),
            },
          ];
        });
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
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
              title="View consultation history"
            >
              <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>History</span>
            </button>
          )}

          {onNewConversation && (
            <button
              type="button"
              onClick={onNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
              title="Start a new consultation"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">New Consultation</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 dark:hover:border-rose-900 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs transition-colors"
            title="Clear current chat messages"
            aria-label="Clear chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
            title="Export consultation summary"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Prominent Medical Disclaimer Banner */}
      <div
        className="bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200/80 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 shadow-2xs"
        role="note"
        aria-label="Medical disclaimer"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-tight">
          <span className="font-semibold">Medical Disclaimer:</span> This AI assistant provides general health education and symptom literacy. It is <strong>not</strong> a substitute for professional clinical judgment, diagnosis, or treatment. In a medical or mental health emergency, call <strong>911</strong> or <strong>988</strong> immediately.
        </p>
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
            createdAt={m.created_at}
            isTyping={isLoading && m.role === "assistant" && !m.content}
            onOpenBookingModal={(mode) => {
              if (mode) setBookingMode(mode);
              setShowBooking(true);
            }}
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
        <div className="px-4 py-2 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 select-none">
            Suggested:
          </span>
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(chip)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors shadow-2xs",
                isLoading
                  ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Footer Area: Sentiment badge + Chat Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
        <SentimentIndicator
          mood={detectedMood}
          onOpenBreathing={() => setShowBreathing(true)}
          onOpenGrounding={() => setShowGrounding(true)}
        />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        <div className="text-center pt-0.5">
          <Link
            href="/terms"
            className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
          >
            <span>Verified Medical Knowledge Base (CDC, MedlinePlus, WHO) • Terms & Policy</span>
          </Link>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        initialMode={bookingMode}
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
