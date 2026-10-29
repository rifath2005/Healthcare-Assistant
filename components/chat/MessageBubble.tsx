"use client";

import React, { useState } from "react";
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
  onOpenBookingModal?: (mode?: "virtual" | "direct") => void;
}

export function MessageBubble({
  id,
  role,
  content,
  citations = [],
  onOpenBookingModal,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);

  const isUser = role === "user";

  const cleanText = (text: string) =>
    text.replace(/\s*\[\d+\](?:\s*,\s*\[\d+\])*/g, "");

  const displayContent = cleanText(content);

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
        <div className="whitespace-pre-wrap break-words">{displayContent}</div>

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

        {/* Footer controls (copy, feedback) */}
        {!isUser && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                title="Copy response"
                aria-label="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Thumbs up/down response rating (Task 6.11) */}
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
