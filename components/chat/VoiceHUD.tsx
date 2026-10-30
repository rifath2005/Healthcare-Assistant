"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { type PendingVoiceAction } from "@/lib/voiceActions";
import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "awaiting_confirmation";

interface VoiceHUDProps {
  state: VoiceState;
  interimTranscript: string;
  finalTranscript: string;
  speakingSentence: string;
  pendingAction: PendingVoiceAction | null;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onInterrupt: () => void;
  onExitVoiceMode: () => void;
  actionExecuting?: boolean;
  ttsProvider?: "vexyl" | "web-speech";
  vexylLang?: string;
  onChangeVexylLang?: (lang: string) => void;
  vexylStyle?: "warm" | "default" | "formal";
  onChangeVexylStyle?: (style: "warm" | "default" | "formal") => void;
  micStream?: MediaStream | null;
}

export function VoiceHUD({
  state,
  interimTranscript,
  finalTranscript,
  speakingSentence,
  pendingAction,
  onConfirmAction,
  onCancelAction,
  onInterrupt,
  onExitVoiceMode,
  actionExecuting,
  ttsProvider = "vexyl",
  vexylLang = "en-IN",
  onChangeVexylLang,
  vexylStyle = "warm",
  onChangeVexylStyle,
  micStream,
}: VoiceHUDProps) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isConfirming = state === "awaiting_confirmation" || Boolean(pendingAction);

  // Real-time audio frequency bars & volume state
  const [frequencies, setFrequencies] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isHearingSound, setIsHearingSound] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // If not listening, reset to flat baseline with zero movement
    if (state !== "listening") {
      setFrequencies([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      setIsHearingSound(false);
      return;
    }

    // If live micStream is not yet attached or supported, drive wave with interim transcript
    if (!micStream) {
      const hasText = Boolean(interimTranscript && interimTranscript.trim());
      setIsHearingSound(hasText);
      setFrequencies(hasText ? [18, 32, 45, 60, 52, 40, 28, 15, 8] : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        // Fallback: drive wave with interim transcript if Web Audio is unsupported
        const hasText = Boolean(interimTranscript.trim());
        setIsHearingSound(hasText);
        setFrequencies(hasText ? [18, 32, 45, 60, 52, 40, 28, 15, 8] : [0, 0, 0, 0, 0, 0, 0, 0, 0]);
        return;
      }

      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;

      const source = ctx.createMediaStreamSource(micStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sampleAudio = () => {
        analyser.getByteFrequencyData(dataArray);

        // Sample 9 frequency bands across spectrum
        const step = Math.floor(bufferLength / 9) || 1;
        const bands: number[] = [];
        let sum = 0;

        for (let i = 0; i < 9; i++) {
          const val = dataArray[i * step] || 0;
          bands.push(val);
          sum += val;
        }

        const avgVolume = sum / 9;
        const hearing = avgVolume > 9 || Boolean(interimTranscript.trim());

        setIsHearingSound(hearing);
        setFrequencies(hearing ? bands : [0, 0, 0, 0, 0, 0, 0, 0, 0]);

        animationFrameRef.current = requestAnimationFrame(sampleAudio);
      };

      animationFrameRef.current = requestAnimationFrame(sampleAudio);
    } catch (err) {
      console.warn("Audio analyser error in VoiceHUD:", err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, [micStream, state, interimTranscript]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200"
      role="region"
      aria-label="Talkative Voice Mode Overlay"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 border border-emerald-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
        {/* Top Header: Title, Status & Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Talkative Voice Assistant
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Natural Spoken Medical Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onChangeVexylStyle && (
              <select
                value={vexylStyle}
                onChange={(e) => onChangeVexylStyle(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none"
                aria-label="Select Bedside Tone"
              >
                <option value="warm">Bedside: Empathetic</option>
                <option value="default">Bedside: Professional</option>
                <option value="formal">Bedside: Clinical</option>
              </select>
            )}

            <button
              type="button"
              onClick={onExitVoiceMode}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to text chat"
              aria-label="Close voice overlay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Stage: Interactive Voice Wave Visualizer */}
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          {/* Dynamic Audio Waveform */}
          <div className="relative flex items-center justify-center h-24 w-full">
            {/* Ambient Ripple Aura when hearing user speech */}
            {isListening && isHearingSound && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-24 h-24 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
                <span className="w-32 h-32 rounded-full bg-emerald-500/10 animate-pulse duration-700" />
              </div>
            )}

            {/* Speaking Pulse Halo */}
            {isSpeaking && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-28 h-28 rounded-full bg-blue-500/20 animate-pulse duration-700" />
              </div>
            )}

            {/* Thinking Orbital Glow */}
            {isThinking && (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
              </div>
            )}

            {/* Waveform Equalizer Bars (Responsive to real mic volume / speech) */}
            {!isThinking && (
              <div className="flex items-center gap-1.5 sm:gap-2 h-16 px-4 z-10">
                {frequencies.map((band, idx) => {
                  let barHeight = 4; // Flat baseline when silent

                  if (isListening) {
                    if (isHearingSound) {
                      // Dynamically scale wave height proportional to user speech volume
                      const normalized = Math.max(8, Math.min(60, Math.round((band / 255) * 60)));
                      barHeight = normalized;
                    } else {
                      // Silent: completely flat with ZERO movement
                      barHeight = 4;
                    }
                  } else if (isSpeaking) {
                    // Assistant speech animation rhythm
                    const offsets = [16, 32, 48, 56, 44, 52, 38, 22, 14];
                    barHeight = offsets[idx % offsets.length];
                  }

                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}px` }}
                      className={cn(
                        "w-1.5 sm:w-2 rounded-full transition-all duration-75",
                        isListening
                          ? isHearingSound
                            ? "bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/50"
                            : "bg-slate-300 dark:bg-slate-700"
                          : isSpeaking
                          ? "bg-blue-500 dark:bg-blue-400 animate-pulse"
                          : "bg-slate-300 dark:bg-slate-700"
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Current State Status Pill */}
          <div>
            {isListening && isHearingSound && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-sm animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                <span>Hearing your voice...</span>
              </span>
            )}

            {isListening && !isHearingSound && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span>Listening for your voice (speak anytime)...</span>
              </span>
            )}

            {isThinking && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Consulting clinical guidelines...</span>
              </span>
            )}

            {isSpeaking && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800 shadow-sm">
                <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                <span>Assistant Speaking (tap below to interrupt)</span>
              </span>
            )}

            {isConfirming && !isSpeaking && !isListening && !isThinking && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>Awaiting spoken confirmation (&ldquo;Yes&rdquo; / &ldquo;No&rdquo;)</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Audio Transcript Display Box */}
        <div className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm space-y-2.5 max-h-36 overflow-y-auto shadow-inner">
          {/* User speech caption */}
          <div className="flex items-start gap-2">
            <span className="text-slate-400 dark:text-slate-500 font-semibold shrink-0 select-none">You:</span>
            <p className="text-slate-800 dark:text-slate-200 break-words leading-relaxed font-medium">
              {interimTranscript ? (
                <span className="text-emerald-700 dark:text-emerald-400 italic">
                  {interimTranscript} ...
                </span>
              ) : finalTranscript ? (
                <span>{finalTranscript}</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 italic font-normal">
                  Speak naturally, e.g., &ldquo;Book with Dr. Lin next Tuesday&rdquo; or describe symptoms...
                </span>
              )}
            </p>
          </div>

          {/* Assistant speech caption */}
          {speakingSentence && (
            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 select-none">
                Assistant:
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed break-words font-medium">
                {speakingSentence}
              </p>
            </div>
          )}
        </div>

        {/* Action Confirmation Modal Card (when booking or cancellation is detected) */}
        {pendingAction && (
          <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Confirm {pendingAction.type === "book" ? "Appointment Booking" : pendingAction.type === "reschedule" ? "Reschedule Appointment" : "Appointment Cancellation"}
                </span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                {pendingAction.consultationType === "direct" ? "In-Person Visit" : "Virtual Video Meet"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold truncate">{pendingAction.doctor.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{pendingAction.dateDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{pendingAction.timeDisplay}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {pendingAction.doctor.specialty}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 italic">
                Say &ldquo;Yes&rdquo; to confirm or tap:
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancelAction}
                  disabled={actionExecuting}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmAction}
                  disabled={actionExecuting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionExecuting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Action</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Control Actions */}
        <div className="flex items-center justify-between pt-2">
          {/* Left: Barge-In / Interrupt Button */}
          {isSpeaking ? (
            <button
              type="button"
              onClick={onInterrupt}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors shadow-2xs"
            >
              <VolumeX className="w-4 h-4" />
              <span>Interrupt & Speak</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Microphone Active</span>
            </div>
          )}

          {/* Right: Switch back to text chat */}
          <button
            type="button"
            onClick={onExitVoiceMode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Switch to Text Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
