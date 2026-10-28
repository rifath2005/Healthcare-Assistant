"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Play, Pause, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BreathingTechnique = "4-7-8" | "box";

interface BreathingExerciseProps {
  onClose?: () => void;
}

export function BreathingExercise({ onClose }: BreathingExerciseProps) {
  const [technique, setTechnique] = useState<BreathingTechnique>("4-7-8");
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Pause">("Inhale");
  const [countdown, setCountdown] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Technique intervals
  const config = useMemo(() => {
    return technique === "4-7-8"
      ? { inhale: 4, hold: 7, exhale: 8, pause: 0 }
      : { inhale: 4, hold: 4, exhale: 4, pause: 4 };
  }, [technique]);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Phase Transition
        if (phase === "Inhale") {
          setPhase("Hold");
          return config.hold;
        } else if (phase === "Hold") {
          setPhase("Exhale");
          return config.exhale;
        } else if (phase === "Exhale") {
          if (config.pause > 0) {
            setPhase("Pause");
            return config.pause;
          } else {
            setPhase("Inhale");
            return config.inhale;
          }
        } else {
          setPhase("Inhale");
          return config.inhale;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, phase, config]);

  const resetExercise = () => {
    setIsActive(false);
    setPhase("Inhale");
    setCountdown(config.inhale);
  };

  return (
    <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl space-y-5 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close breathing widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
            Guided Breathing Pacer
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Regulates heart rate and de-escalates acute nervous system tension
          </p>
        </div>

        <div className="flex bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-0.5 text-xs font-semibold">
          <button
            onClick={() => {
              setTechnique("4-7-8");
              resetExercise();
            }}
            className={cn(
              "px-3 py-1 rounded-lg transition-all",
              technique === "4-7-8"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            4-7-8 Relax
          </button>
          <button
            onClick={() => {
              setTechnique("box");
              resetExercise();
            }}
            className={cn(
              "px-3 py-1 rounded-lg transition-all",
              technique === "box"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            Box Pacing
          </button>
        </div>
      </div>

      {/* Visual Breathing Pacer Circle */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-1000",
              phase === "Inhale"
                ? "scale-125 border-emerald-500 bg-emerald-500/20 shadow-2xl shadow-emerald-500/30"
                : phase === "Hold"
                ? "scale-125 border-teal-500 bg-teal-500/20"
                : phase === "Exhale"
                ? "scale-90 border-sky-500 bg-sky-500/10"
                : "scale-90 border-slate-400 bg-slate-500/10"
            )}
          >
            <div className="text-center">
              <span className="block text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                {isActive ? phase : "Ready"}
              </span>
              <span className="block text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {isActive ? countdown : config.inhale}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isActive ? "Pause" : "Start Session"}
        </button>

        <button
          type="button"
          onClick={resetExercise}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          title="Reset"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          title={soundEnabled ? "Mute chime" : "Enable chime"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
