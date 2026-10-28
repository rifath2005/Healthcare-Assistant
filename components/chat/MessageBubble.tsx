"use client";

import React, { useState } from "react";
import { User, Bot, Copy, Check, ThumbsUp, ThumbsDown, ExternalLink, BookOpen } from "lucide-react";
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
  onOpenBookingModal?: () => void;
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
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const isUser = role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
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
        <div className="whitespace-pre-wrap break-words">{content}</div>

        {/* Interactive Appointment Trigger Card inside chat if suggested */}
        {suggestsBooking && onOpenBookingModal && (
          <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Ready to consult a physician?
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Book a 30-minute telehealth consultation with certified doctors.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBookingModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
            >
              Book Doctor
            </button>
          </div>
        )}

        {/* Citation Pills (Task 3.7) */}
        {citations && citations.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Verified Medical Sources:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {citations.map((c) => (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => setActiveCitation(activeCitation?.index === c.index ? null : c)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                    activeCitation?.index === c.index
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                  )}
                >
                  <span className="font-bold">[{c.index}]</span>
                  <span className="truncate max-w-[150px]">{c.title}</span>
                </button>
              ))}
            </div>

            {/* Citation Excerpt Popover */}
            {activeCitation && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>
                    [{activeCitation.index}] {activeCitation.title}
                  </span>
                  {activeCitation.source_url && (
                    <a
                      href={activeCitation.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic">{activeCitation.excerpt}</p>
              </div>
            )}
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
