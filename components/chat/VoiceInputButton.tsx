"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const resetSilenceTimeout = () => {
    clearSilenceTimeout();
    // Wait for 5 seconds of silence (mute state) before automatically turning off mic
    silenceTimeoutRef.current = setTimeout(() => {
      stopListening();
    }, 5000);
  };

  const stopListening = () => {
    clearSilenceTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info(
        "Voice transcription is not supported in this browser. Please use Google Chrome, Edge, or Safari."
      );
      setIsSupported(false);
      return;
    }

    // 1. Warm up and verify microphone permission via getUserMedia
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release stream tracks immediately so SpeechRecognition engine can bind cleanly to mic
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
        toast.error("Microphone access was denied. Please allow microphone permissions in your browser address bar.");
        return;
      }
    }

    // 2. Instantiate a fresh SpeechRecognition instance on every activation
    try {
      const recognition = new SpeechRecognition();
      // Continuous mode allows user to pause naturally without instant cutoff
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        resetSilenceTimeout();
        toast.info("Listening... Speak clearly (will auto-stop after 5s of silence).");
      };

      recognition.onspeechstart = () => {
        resetSilenceTimeout();
      };

      recognition.onspeechend = () => {
        resetSilenceTimeout();
      };

      recognition.onresult = (event: any) => {
        // Reset 5s silence countdown upon receiving audio/speech
        resetSilenceTimeout();

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            const transcript = item[0].transcript;
            if (transcript && transcript.trim()) {
              onTranscript(transcript.trim());
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        clearSilenceTimeout();
        setIsListening(false);

        if (event.error === "network") {
          toast.error(
            "Speech recognition network error: Google Speech Services was unreachable. If you have Brevity or adblockers active, please disable them for localhost:3001.",
            { duration: 7000 }
          );
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("Microphone permission was denied. Please enable microphone permissions in your browser address bar.");
        } else if (event.error === "no-speech") {
          // If no speech detected, silence timeout or stop gracefully
          resetSilenceTimeout();
        } else if (event.error !== "aborted") {
          toast.error(`Speech recognition: ${event.error}`);
        }
      };

      recognition.onend = () => {
        clearSilenceTimeout();
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      clearSilenceTimeout();
      setIsListening(false);
      toast.error("Could not start speech recognition: " + (err.message || "Unknown error"));
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "p-2.5 rounded-xl transition-all relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500",
        isListening
          ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30"
          : isSupported
          ? "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800"
          : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
      )}
      title={
        !isSupported
          ? "Voice speech recognition not supported in this browser"
          : isListening
          ? "Click to stop recording"
          : "Click to speak voice inquiry"
      }
      aria-label={isListening ? "Stop listening" : "Start voice dictation"}
    >
      {isListening ? (
        <span className="flex items-center gap-1.5">
          <MicOff className="w-5 h-5 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        </span>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
