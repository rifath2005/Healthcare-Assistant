"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Loader2, Radio } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  isVoiceMode?: boolean;
  onToggleVoiceMode?: () => void;
}

const MAX_CHARACTERS = 2000;

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled,
  placeholder = "Describe your symptoms or wellness questions...",
  isVoiceMode = false,
  onToggleVoiceMode,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on initial mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Re-focus whenever assistant finishes responding
  useEffect(() => {
    if (!isLoading && !disabled) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [isLoading, disabled]);

  // Auto-resize textarea height as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isLoading || disabled) return;

    const messageText = content.trim();
    setContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    onSendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        handleSubmit();
      }
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  return (
    <div
      onClick={() => textareaRef.current?.focus()}
      className="relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all p-2 sm:p-2.5 cursor-text"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARACTERS))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        readOnly={isLoading}
        placeholder={isLoading ? "Healthcare Assistant is replying..." : placeholder}
        className={cn(
          "w-full resize-none bg-transparent px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-44",
          isLoading && "cursor-wait opacity-70",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />

      <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-0.5 sm:mt-1 px-0.5 sm:px-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled || isLoading}
          />
          {onToggleVoiceMode && (
            <button
              type="button"
              onClick={onToggleVoiceMode}
              disabled={disabled || isLoading}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all",
                isVoiceMode
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600"
              )}
              title={isVoiceMode ? "Switch to Text Mode" : "Switch to Talkative Spoken Voice Mode"}
            >
              <Radio className={cn("w-3.5 h-3.5", isVoiceMode && "animate-pulse")} />
              <span className="hidden sm:inline">{isVoiceMode ? "Voice Active" : "Voice Mode"}</span>
            </button>
          )}
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 select-none">
            {content.length}/{MAX_CHARACTERS}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!content.trim() || isLoading || disabled}
          className={cn(
            "p-2 sm:p-2.5 rounded-xl font-medium text-sm flex items-center justify-center transition-all",
            content.trim() && !isLoading
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <SendHorizontal className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
