"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARACTERS = 2000;

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled,
  placeholder = "Describe your symptoms or wellness questions...",
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    onSendMessage(content.trim());
    setContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
  };

  return (
    <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all p-2.5">
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARACTERS))}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-2.5 py-1 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-44 disabled:opacity-50"
      />

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1 px-1">
        <div className="flex items-center gap-2">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled || isLoading}
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 select-none">
            {content.length}/{MAX_CHARACTERS}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!content.trim() || isLoading || disabled}
          className={cn(
            "p-2.5 rounded-xl font-medium text-sm flex items-center justify-center transition-all",
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
