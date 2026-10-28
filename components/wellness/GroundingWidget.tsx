"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Eye, Hand, Volume2, Sparkles, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroundingWidgetProps {
  onClose?: () => void;
}

const STEPS = [
  {
    count: 5,
    title: "5 Things You Can SEE",
    desc: "Scan your surroundings. Look for small details, textures, or shadows.",
    icon: Eye,
  },
  {
    count: 4,
    title: "4 Things You Can TOUCH",
    desc: "Feel your feet on the ground, clothing texture, or cool desk surface.",
    icon: Hand,
  },
  {
    count: 3,
    title: "3 Things You Can HEAR",
    desc: "Listen for ambient sounds: gentle hum of fan, birds, or distant traffic.",
    icon: Volume2,
  },
  {
    count: 2,
    title: "2 Things You Can SMELL",
    desc: "Notice subtle aromas: fresh air, soap, tea, or deep breath in through your nose.",
    icon: Sparkles,
  },
  {
    count: 1,
    title: "1 Thing You Can TASTE",
    desc: "Notice the current taste on your palate, sip water, or recall a fresh flavor.",
    icon: Smile,
  },
];

export function GroundingWidget({ onClose }: GroundingWidgetProps) {
  const [completed, setCompleted] = useState<number[]>([]);

  const toggleStep = (index: number) => {
    if (completed.includes(index)) {
      setCompleted(completed.filter((i) => i !== index));
    } else {
      setCompleted([...completed, index]);
    }
  };

  const progressPercent = Math.round((completed.length / STEPS.length) * 100);

  return (
    <div className="p-6 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-3xl space-y-4 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close grounding widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div>
        <h3 className="text-base font-bold text-teal-950 dark:text-teal-200">
          5-4-3-2-1 Sensory Grounding
        </h3>
        <p className="text-xs text-teal-700 dark:text-teal-400">
          Anchors your attention in the physical present to de-escalate anxiety
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-teal-200/50 dark:bg-teal-900/40 rounded-full h-2 overflow-hidden">
        <div
          className="bg-teal-600 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-2 pt-1">
        {STEPS.map((step, idx) => {
          const isDone = completed.includes(idx);
          const Icon = step.icon;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleStep(idx)}
              className={cn(
                "w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3",
                isDone
                  ? "bg-teal-100/60 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 opacity-90"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400"
              )}
            >
              <div className="pt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isDone
                        ? "line-through text-slate-500 dark:text-slate-400"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {completed.length === STEPS.length && (
        <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-xl text-center text-xs font-semibold text-teal-800 dark:text-teal-200">
          ✨ Excellent job completing the grounding cycle. Notice the calm in your breath.
        </div>
      )}
    </div>
  );
}
