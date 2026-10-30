"use client";

import React from "react";
import { Sparkles, Heart } from "lucide-react";

interface SentimentIndicatorProps {
  mood?: string;
  intensity?: number;
}

export function SentimentIndicator({
  mood,
  intensity = 1,
}: SentimentIndicatorProps) {
  const isElevated = mood && ["anxious", "depressed", "stressed", "overwhelmed"].includes(mood.toLowerCase());

  return (
    <div className="flex items-center justify-between text-[11px] sm:text-xs py-1 sm:py-1.5 px-2.5 sm:px-3 bg-slate-50/90 dark:bg-slate-800/60 rounded-lg sm:rounded-xl mb-1 sm:mb-1.5 border border-slate-200/70 dark:border-slate-700/60">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-slate-600 dark:text-slate-300 truncate">
          Tone:{" "}
          <strong className="text-slate-800 dark:text-slate-100 capitalize">
            {mood || "Neutral / Inquiring"}
          </strong>
        </span>
        {isElevated && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
            <Heart className="w-2.5 h-2.5 text-amber-600" />
            <span>Support Mode</span>
          </span>
        )}
      </div>
    </div>
  );
}
