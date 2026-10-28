"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
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
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            onTranscript(item[0].transcript);
          } else {
            currentTranscript += item[0].transcript;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
        } else if (event.error !== "no-speech") {
          toast.error(`Speech recognition: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Speech recognition initialization failed:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      toast.info("Voice transcription is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        toast.info("Listening... Speak your symptoms or health questions clearly.");
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

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
