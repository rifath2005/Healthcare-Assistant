"use client";

import React from "react";
import { Wind, Anchor, Sparkles } from "lucide-react";

interface SentimentIndicatorProps {
  mood?: string;
  intensity?: number;
  onOpenBreathing: () => void;
  onOpenGrounding: () => void;
}

export function SentimentIndicator({
  mood,
  intensity = 1,
  onOpenBreathing,
  onOpenGrounding,
}: SentimentIndicatorProps) {
  const isElevated = mood && ["anxious", "depressed", "stressed", "overwhelmed"].includes(mood.toLowerCase());

  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl mb-2 border border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-slate-600 dark:text-slate-300">
          Detected Tone:{" "}
          <strong className="text-slate-800 dark:text-slate-100 capitalize">
            {mood || "Neutral / Inquiring"}
          </strong>
        </span>
        {isElevated && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Support Mode Active
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenBreathing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors shadow-xs"
        >
          <Wind className="w-3.5 h-3.5 text-emerald-500" />
          <span>4-7-8 Breathing</span>
        </button>

        <button
          type="button"
          onClick={onOpenGrounding}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors shadow-xs"
        >
          <Anchor className="w-3.5 h-3.5 text-teal-500" />
          <span>5-4-3-2-1 Grounding</span>
        </button>
      </div>
    </div>
  );
}
