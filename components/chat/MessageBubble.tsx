"use client";

import React, { useState, useEffect } from "react";
import { User, Bot, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Citation {
  index: number;
  title: string;
  source_url?: string;
  excerpt: string;
}

export interface MessageBubbleProps {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  createdAt?: string;
  isTyping?: boolean;
  onOpenBookingModal?: (mode?: "virtual" | "direct") => void;
}

function formatMessageTime(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

function renderMessageContent(content: string) {
  // Matches markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-2 break-all"
      >
        {linkText}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function MessageBubble({
  id,
  role,
  content,
  citations = [],
  createdAt,
  isTyping,
  onOpenBookingModal,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUser = role === "user";

  const cleanText = (text: string) =>
    text
      .replace(/\s*\[\d+\](?:\s*,\s*\[\d+\])*/g, "")
      .replace(/\n*(?:\*{1,2})?(?:Medical\s+)?Disclaimer:?(?:\*{1,2})?\s*(?:This\s+(?:AI\s+)?(?:assistant|information|response)|I\s+am\s+an\s+AI|Always\s+consult\s+a\s+doctor|In\s+an\s+emergency\s+call)[^\n]*/gi, "")
      .trim();

  const displayContent = cleanText(content);
  const timeStr = mounted ? formatMessageTime(createdAt) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (rating: 1 | -1) => {
    setFeedback(rating);
    toast.success(rating === 1 ? "Thank you for the positive feedback!" : "Feedback recorded for model improvement.");

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, rating }),
      });
    } catch (e) {
      console.warn("Feedback submission error:", e);
    }
  };

  // Detect if content suggests scheduling an appointment
  const suggestsBooking = !isUser && (
    content.toLowerCase().includes("schedule an appointment") ||
    content.toLowerCase().includes("book a consultation") ||
    content.toLowerCase().includes("booking an appointment")
  );

  return (
    <div
      className={cn(
        "flex gap-3 py-3 px-1 transition-all",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-slate-900 dark:bg-emerald-950 text-emerald-400 border border-emerald-500/20"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Content */}
      <div
        className={cn(
          "max-w-2xl rounded-3xl p-4 text-sm leading-relaxed space-y-2.5 shadow-xs",
          isUser
            ? "bg-emerald-600 text-white rounded-tr-xs"
            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
        )}
      >
        {/* Typing indicator when waiting for stream */}
        {!isUser && (!displayContent.trim() || isTyping) && (
          <div
            className="flex items-center gap-1.5 py-1 text-slate-500 dark:text-slate-400"
            role="status"
            aria-label="Assistant is formulating response"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-bounce" />
            <span className="text-xs ml-1 font-medium text-emerald-700 dark:text-emerald-400">
              Consulting medical guidelines...
            </span>
          </div>
        )}

        {displayContent.trim() && (
          <div className="whitespace-pre-wrap break-words">{renderMessageContent(displayContent)}</div>
        )}

        {/* User timestamp */}
        {isUser && timeStr && (
          <div suppressHydrationWarning className="text-[10px] text-emerald-100/80 text-right select-none pt-0.5">
            {timeStr}
          </div>
        )}

        {/* Interactive Appointment Trigger Card inside chat if suggested */}
        {suggestsBooking && onOpenBookingModal && (
          <div className="mt-3 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2.5">
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Ready to consult a physician?
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Schedule a consultation with our clinic doctors:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenBookingModal("virtual")}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>🌐 Book Virtual (Meet)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenBookingModal("direct")}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>🏥 Direct In-Person Visit</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer controls (copy, feedback, timestamp) for assistant */}
        {!isUser && displayContent.trim() && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                title="Copy response"
                aria-label="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {timeStr && (
                <span suppressHydrationWarning className="text-[10px] text-slate-400 dark:text-slate-500 select-none">
                  {timeStr}
                </span>
              )}
            </div>

            {/* Thumbs up/down response rating */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] pr-1">Was this helpful?</span>
              <button
                type="button"
                onClick={() => handleFeedback(1)}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  feedback === 1
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                    : "hover:text-slate-700 dark:hover:text-slate-200"
                )}
                title="Helpful response"
                aria-label="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(-1)}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  feedback === -1
                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50"
                    : "hover:text-slate-700 dark:hover:text-slate-200"
                )}
                title="Unhelpful response"
                aria-label="Unhelpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
