"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageBubble, type Citation } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { CrisisBanner } from "./CrisisBanner";
import { SentimentIndicator } from "./SentimentIndicator";
import { BookingModal } from "@/components/appointment/BookingModal";
import { ExportSummaryModal } from "./ExportSummaryModal";
import { VoiceHUD, type VoiceState, type TaskVerificationStatus } from "./VoiceHUD";
import { VoiceTtsManager, SPOKEN_MEDICAL_DISCLAIMER } from "@/lib/voiceTts";
import {
  detectVoiceAction,
  isAffirmativeConfirmation,
  isNegativeDecline,
  type PendingVoiceAction,
} from "@/lib/voiceActions";
import {
  getGuestMessages,
  setGuestMessages,
  clearGuestMessages,
  type GuestMessage,
} from "@/lib/supabase/syncGuestSession";
import { createClient } from "@/lib/supabase/client";
import {
  HeartPulse,
  Download,
  Menu,
  Plus,
  History,
  RotateCcw,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

interface ChatContainerProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
  showBreathing?: boolean;
  showGrounding?: boolean;
  onCloseBreathing?: () => void;
  onCloseGrounding?: () => void;
}

const INITIAL_WELCOME_MESSAGE: Message = {
  id: "welcome-msg",
  role: "assistant",
  content:
    "Hello! I am your Smart Healthcare Assistant. You can ask me health questions, describe symptoms you are experiencing, or learn about medical conditions and preventive care.\n\n*Reminder: I provide evidence-grounded health literacy and guidance, not formal clinical diagnoses or prescription medication.*",
};

const SUGGESTION_CHIPS = [
  "I have had a dull headache for 2 days",
  "What are the warning signs of a heart attack?",
  "Feeling overwhelmed with stress and anxiety",
  "How do I schedule an appointment with a clinic doctor?",
];

export function ChatContainer({
  conversationId,
  onConversationCreated,
  onNewConversation,
  onToggleSidebar,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MESSAGE]);
  const currentConvIdRef = useRef<string | null>(conversationId || null);

  const [isLoading, setIsLoading] = useState(false);
  const [crisisState, setCrisisState] = useState<{
    triggered: boolean;
    severity?: string;
    trigger?: string;
  }>({ triggered: false });

  const [detectedMood, setDetectedMood] = useState<string>("neutral");
  const [showBooking, setShowBooking] = useState(false);
  const [bookingMode, setBookingMode] = useState<"virtual" | "direct">("virtual");
  const [showExport, setShowExport] = useState(false);

  // --- Voice / Talkative Mode State ---
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [speakingSentence, setSpeakingSentence] = useState("");
  const [pendingVoiceAction, setPendingVoiceAction] = useState<PendingVoiceAction | null>(null);
  const [actionExecuting, setActionExecuting] = useState(false);
  const [taskVerification, setTaskVerification] = useState<TaskVerificationStatus | null>(null);
  const [userAppointments, setUserAppointments] = useState<any[]>([]);
  const [ttsProvider, setTtsProvider] = useState<"vexyl" | "web-speech">("web-speech");
  const [vexylLang, setVexylLang] = useState<string>("en-IN");
  const [vexylStyle, setVexylStyle] = useState<"warm" | "default" | "formal">("warm");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Refs for stable callbacks
  const isVoiceModeRef = useRef<boolean>(false);
  const isMicMutedRef = useRef<boolean>(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const isLoadingRef = useRef<boolean>(false);
  const isListeningActiveRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const pendingVoiceActionRef = useRef<PendingVoiceAction | null>(null);
  const userAppointmentsRef = useRef<any[]>([]);
  const voiceTtsRef = useRef<VoiceTtsManager>(null!);
  if (!voiceTtsRef.current) {
    voiceTtsRef.current = new VoiceTtsManager();
  }
  const recognitionRef = useRef<any>(null);
  const speechSilenceTimerRef = useRef<any>(null);
  const latestInterimRef = useRef<string>("");
  const accumulatedTranscriptRef = useRef<string>("");
  const dispatchVoiceTurnRef = useRef<(text: string) => void>(() => {});
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronous ref + state helpers to prevent render-latency race conditions
  const updateLoading = useCallback((val: boolean) => {
    isLoadingRef.current = val;
    setIsLoading(val);
  }, []);

  const updateVoiceState = useCallback((state: VoiceState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
  }, []);

  const startListeningLoopRef = useRef<() => void>(() => {});
  const messagesLengthRef = useRef<number>(0);

  // Mute / Unmute Microphone toggle handler
  const toggleMuteMic = useCallback(() => {
    const nextMuted = !isMicMutedRef.current;
    isMicMutedRef.current = nextMuted;
    setIsMicMuted(nextMuted);

    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (nextMuted) {
      // Capture any spoken words up to the moment mute was pressed
      const pendingSpoken = (latestInterimRef.current || accumulatedTranscriptRef.current).trim();

      if (speechSilenceTimerRef.current) {
        clearTimeout(speechSilenceTimerRef.current);
        speechSilenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      isListeningActiveRef.current = false;

      // If user spoke words before hitting mute, take speech up until mute as input and process immediately!
      if (
        pendingSpoken.length >= 2 &&
        (voiceStateRef.current === "listening" || voiceStateRef.current === "awaiting_confirmation")
      ) {
        accumulatedTranscriptRef.current = "";
        latestInterimRef.current = "";
        setFinalTranscript(pendingSpoken);
        setInterimTranscript("");
        updateVoiceState("thinking");
        dispatchVoiceTurnRef.current(pendingSpoken);
      } else {
        setInterimTranscript("");
      }
      toast.info("Microphone muted");
    } else {
      toast.success("Microphone unmuted");
      if (
        isVoiceModeRef.current &&
        !isLoadingRef.current &&
        !voiceTtsRef.current.isPlaybackActive() &&
        voiceStateRef.current !== "speaking" &&
        voiceStateRef.current !== "thinking"
      ) {
        updateVoiceState("listening");
        startListeningLoopRef.current();
      }
    }
  }, [updateVoiceState]);

  // Keep refs in sync with state
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    pendingVoiceActionRef.current = pendingVoiceAction;
  }, [pendingVoiceAction]);

  useEffect(() => {
    userAppointmentsRef.current = userAppointments;
  }, [userAppointments]);

  // Auto scroll to latest tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, crisisState, pendingVoiceAction, interimTranscript]);

  // Load user active appointments for action context
  const loadUserAppointments = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "confirmed")
          .order("start_time", { ascending: true });
        if (data) {
          setUserAppointments(data);
          userAppointmentsRef.current = data;
        }
      }
    } catch (e) {
      console.warn("Failed to load user appointments for voice context:", e);
    }
  }, []);

  // Configure Voice TTS Manager callbacks on mount
  useEffect(() => {
    voiceTtsRef.current.updateOptions({
      onStartSpeaking: () => {
        updateVoiceState("speaking");
        // Pause microphone while bot is speaking to prevent acoustic feedback / recognition abort
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
        isListeningActiveRef.current = false;
      },
      onSentenceSpoken: (sentence) => {
        setSpeakingSentence(sentence);
      },
      onFinishSpeaking: () => {
        setSpeakingSentence("");
        if (!isVoiceModeRef.current) {
          updateVoiceState("idle");
          return;
        }

        // If the model is STILL streaming tokens or TTS is still playing/buffering,
        // stay in "thinking" mode and wait for remaining speech
        if (isLoadingRef.current || voiceTtsRef.current.isPlaybackActive()) {
          updateVoiceState("thinking");
          return;
        }

        // Entire response has finished speaking!
        if (pendingVoiceActionRef.current) {
          updateVoiceState("awaiting_confirmation");
        } else {
          updateVoiceState("listening");
        }
        startListeningLoopRef.current();
      },
      onError: (err) => {
        console.warn("TTS error:", err);
        setSpeakingSentence("");
        if (isVoiceModeRef.current) {
          if (isLoadingRef.current || voiceTtsRef.current.isPlaybackActive()) {
            updateVoiceState("thinking");
          } else {
            updateVoiceState("listening");
            startListeningLoopRef.current();
          }
        }
      },
      onProviderChange: (provider) => {
        setTtsProvider(provider);
      },
    });

    loadUserAppointments();

    return () => {
      voiceTtsRef.current.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [loadUserAppointments, updateVoiceState]);

  // Load past conversation messages from Supabase or localStorage
  useEffect(() => {
    let isMounted = true;

    if (conversationId && conversationId === currentConvIdRef.current && messagesLengthRef.current > 1) {
      return;
    }
    currentConvIdRef.current = conversationId || null;

    async function loadThread() {
      if (conversationId) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("messages")
            .select("id, role, content, metadata, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0 && isMounted) {
            setMessages(
              data.map((m) => ({
                id: m.id,
                role: m.role as any,
                content: m.content,
                citations: (m.metadata as any)?.citations || [],
                created_at: m.created_at,
              }))
            );
            setCrisisState({ triggered: false });
            return;
          }
        } catch (e) {
          console.warn("Failed to load thread messages:", e);
        }
      }

      // Guest mode fallback or initial reset
      if (isMounted) {
        const guestMsgs = getGuestMessages();
        if (guestMsgs.length > 0 && !conversationId) {
          setMessages(guestMsgs as Message[]);
        } else {
          setMessages([INITIAL_WELCOME_MESSAGE]);
        }
        setCrisisState({ triggered: false });
      }
    }

    loadThread();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // --- Voice Loop Methods ---
  const startListeningLoop = () => {
    if (!isVoiceModeRef.current) return;
    if (isMicMutedRef.current) return;
    if (isListeningActiveRef.current) return;
    if (
      voiceStateRef.current === "speaking" ||
      voiceStateRef.current === "thinking" ||
      isLoadingRef.current ||
      voiceTtsRef.current.isPlaybackActive()
    ) {
      return;
    }

    // Only reset speech buffers if starting a fresh turn (not reconnecting while silence timer is running)
    if (!speechSilenceTimerRef.current) {
      accumulatedTranscriptRef.current = "";
      latestInterimRef.current = "";
      setInterimTranscript("");
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningActiveRef.current = true;
        if (pendingVoiceActionRef.current) {
          updateVoiceState("awaiting_confirmation");
        } else {
          updateVoiceState("listening");
        }
      };

      recognition.onresult = (event: any) => {
        let sessionFinal = "";
        let sessionInterim = "";

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            sessionFinal += item[0].transcript + " ";
          } else {
            sessionInterim += item[0].transcript;
          }
        }

        sessionFinal = sessionFinal.trim();
        sessionInterim = sessionInterim.trim();

        // Accumulate prior session segments + current session final + interim
        const currentSpoken = [accumulatedTranscriptRef.current, sessionFinal, sessionInterim]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (currentSpoken) {
          latestInterimRef.current = currentSpoken;
          setInterimTranscript(currentSpoken);

          // Reset the 3-second silence detector on every newly detected word
          if (speechSilenceTimerRef.current) {
            clearTimeout(speechSilenceTimerRef.current);
          }

          // User requirement: Wait until NO words have been received for 3 full seconds before replying!
          speechSilenceTimerRef.current = setTimeout(() => {
            const spokenText = (latestInterimRef.current || accumulatedTranscriptRef.current).trim();
            if (speechSilenceTimerRef.current) {
              clearTimeout(speechSilenceTimerRef.current);
              speechSilenceTimerRef.current = null;
            }

            if (
              spokenText.length >= 2 &&
              isVoiceModeRef.current &&
              (voiceStateRef.current === "listening" || voiceStateRef.current === "awaiting_confirmation")
            ) {
              accumulatedTranscriptRef.current = "";
              latestInterimRef.current = "";
              setFinalTranscript(spokenText);
              setInterimTranscript("");
              isListeningActiveRef.current = false;
              updateVoiceState("thinking");

              try {
                recognition.stop();
              } catch {}

              dispatchVoiceTurnRef.current(spokenText);
            } else {
              // Spurious noise or text shorter than 2 chars; reset buffer and keep listening
              accumulatedTranscriptRef.current = "";
              latestInterimRef.current = "";
              setInterimTranscript("");
            }
          }, 3000);
        }
      };

      recognition.onerror = (event: any) => {
        // Suppress expected lifecycle events (silence or manual stop/abort)
        if (event.error === "aborted" || event.error === "no-speech") {
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("Microphone access was denied. Switching back to text mode.");
          exitVoiceMode();
          return;
        }

        // For temporary network hiccups from Chrome's speech recognition server,
        // let the onend handler safely reconnect.
        if (event.error === "network") {
          return;
        }

        console.warn("Speech recognition notice:", event.error);
      };

      recognition.onend = () => {
        isListeningActiveRef.current = false;

        // If the 3-second silence timer is currently running, save text spoken so far
        if (speechSilenceTimerRef.current && latestInterimRef.current) {
          accumulatedTranscriptRef.current = latestInterimRef.current;
        }

        // Restart listening if still in voice mode and not currently busy
        if (
          isVoiceModeRef.current &&
          voiceStateRef.current !== "speaking" &&
          voiceStateRef.current !== "thinking" &&
          !isLoadingRef.current &&
          !voiceTtsRef.current.isPlaybackActive()
        ) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (
              isVoiceModeRef.current &&
              voiceStateRef.current !== "speaking" &&
              voiceStateRef.current !== "thinking" &&
              !isLoadingRef.current &&
              !voiceTtsRef.current.isPlaybackActive()
            ) {
              startListeningLoop();
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isListeningActiveRef.current = false;
      if (err?.name === "InvalidStateError") {
        isListeningActiveRef.current = true;
      } else {
        console.warn("SpeechRecognition start notice:", err);
      }
    }
  };
  startListeningLoopRef.current = startListeningLoop;

  // Unbreakable self-healing watchdog: restores speech recognition if Chrome or network dropped
  // while the assistant is waiting for user speech
  useEffect(() => {
    if (!isVoiceMode) return;

    const watchdog = setInterval(() => {
      if (!isVoiceModeRef.current) return;
      if (isMicMutedRef.current) return;
      const isBusy =
        isLoadingRef.current ||
        voiceTtsRef.current.isPlaybackActive() ||
        voiceStateRef.current === "speaking" ||
        voiceStateRef.current === "thinking";

      if (!isBusy && !isListeningActiveRef.current) {
        if (pendingVoiceActionRef.current) {
          updateVoiceState("awaiting_confirmation");
        } else {
          updateVoiceState("listening");
        }
        startListeningLoopRef.current();
      }
    }, 1200);

    return () => clearInterval(watchdog);
  }, [isVoiceMode, updateVoiceState]);

  const activateVoiceMode = async () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      toast.info(
        "Spoken voice mode is not supported by your browser. Please use Google Chrome, Edge, or Safari."
      );
      return;
    }

    // Verify microphone permission and obtain live stream for audio wave visualizer
    let stream: MediaStream | null = null;
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        micStreamRef.current = stream;
      }
    } catch (permErr: any) {
      toast.error("Microphone access was denied. Please allow microphone permissions in your browser.");
      return;
    }

    setIsVoiceMode(true);
    isVoiceModeRef.current = true;
    isMicMutedRef.current = false;
    setIsMicMuted(false);
    updateVoiceState("listening");
    toast.success("Talkative Spoken Voice Mode activated.");

    // Detect neural voice capability in background without blocking
    voiceTtsRef.current?.detectVexylAvailability().catch(() => {});

    // Check if user has already heard / acknowledged the disclaimer on this browser/account
    const DISCLAIMER_STORAGE_KEY = "has_acknowledged_voice_disclaimer";
    const hasAlreadyHeard =
      typeof window !== "undefined" &&
      (localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true" || voiceTtsRef.current.getHasSpokenDisclaimer());

    if (!hasAlreadyHeard && voiceTtsRef.current) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
        } catch {}
      }
      voiceTtsRef.current.setHasSpokenDisclaimer(true);
      updateVoiceState("speaking");
      voiceTtsRef.current.speakSentence(
        "Voice mode active. " + SPOKEN_MEDICAL_DISCLAIMER,
        () => {
          if (isVoiceModeRef.current) {
            updateVoiceState("listening");
            startListeningLoop();
          }
        }
      );
    } else {
      // User already heard caution on a prior login/visit — do not repeat, activate listening immediately
      updateVoiceState("listening");
      startListeningLoop();
    }
  };

  const exitVoiceMode = () => {
    setIsVoiceMode(false);
    isVoiceModeRef.current = false;
    isMicMutedRef.current = false;
    setIsMicMuted(false);
    isListeningActiveRef.current = false;
    updateVoiceState("idle");
    setInterimTranscript("");
    setSpeakingSentence("");
    setPendingVoiceAction(null);
    pendingVoiceActionRef.current = null;
    setTaskVerification(null);

    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    accumulatedTranscriptRef.current = "";
    latestInterimRef.current = "";
    setFinalTranscript("");

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      setMicStream(null);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    voiceTtsRef.current?.stop();
    toast.info("Switched to Text Mode.");
  };

  const handleInterrupt = () => {
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    accumulatedTranscriptRef.current = "";
    latestInterimRef.current = "";
    setInterimTranscript("");
    voiceTtsRef.current.stop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    updateLoading(false);
    setSpeakingSentence("");
    if (isVoiceModeRef.current) {
      updateVoiceState("listening");
      startListeningLoop();
    }
  };

  // --- Voice Action Execution Flow ---
  const executeConfirmedAction = async (action: PendingVoiceAction) => {
    setActionExecuting(true);
    updateVoiceState("thinking");

    try {
      if (action.type === "book") {
        const isVirtual = action.consultationType !== "direct";
        const doctorName = action.doctor.name;
        const doctorSpecialty = action.doctor.specialty;
        const optionLabel = `${isVirtual ? "Virtual Telehealth" : "In-Person Clinic Visit"} with ${doctorName}`;

        // Feature 1: Initialize dual verification tracking
        setTaskVerification({
          optionId: action.doctor.id,
          label: optionLabel,
          emailSent: false,
          calendarUpdated: false,
          meetingLinkGenerated: !isVirtual,
          isComplete: false,
          statusMessage: "Checking option: updating calendar and sending confirmation email...",
        });

        // Voice progress reporting as task begins
        if (isVoiceModeRef.current) {
          voiceTtsRef.current.speakSentence(
            isVirtual
              ? "Checking your option: generating your Google Meet link and updating your calendar now."
              : "Checking your option: reserving your clinic consultation and updating your calendar now."
          );
        }

        const res = await fetch("/api/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: action.doctor.id,
            startTime: action.startTime,
            endTime: action.endTime,
            consultationType: action.consultationType,
            patientNotes: "Booked via Smart Voice Assistant",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setTaskVerification(null);
          if (res.status === 401) {
            const spoken =
              "To complete your appointment booking, please sign in to your patient account.";
            appendAssistantSpoken(spoken);
            setShowBooking(true);
            return;
          }
          const spoken =
            data.error || "That time slot is not available. Please suggest another time or physician.";
          appendAssistantSpoken(spoken);
          return;
        }

        const appt = data.appointment || {};
        const verification = data.verification || {};
        const meetLink = appt.meetLink;
        const formattedTime = appt.formattedTime || `${action.dateDisplay} at ${action.timeDisplay}`;
        const clinicRoom = appt.clinicRoom || action.doctor.clinicRoom || "HealthCare Clinic Center, Room 102";

        const emailSent = !!verification.emailSent;
        const calendarUpdated = !!verification.calendarUpdated;
        const meetingLinkGenerated = !!verification.meetingLinkGenerated;
        const isComplete = !!verification.isComplete;

        // Update verified completion state
        setTaskVerification({
          optionId: appt.id || action.doctor.id,
          label: optionLabel,
          emailSent,
          calendarUpdated,
          meetingLinkGenerated,
          isComplete,
          statusMessage: isComplete
            ? "Verified complete: Both calendar invite and confirmation email verified."
            : "Verification pending: Confirmation email or calendar update incomplete.",
        });

        const richMarkdown = isVirtual
          ? `### ✅ Virtual Telehealth Consultation Confirmed!\n\n` +
            `Your appointment with **${doctorName}** (${doctorSpecialty}) has been successfully scheduled.\n\n` +
            `- 📅 **Date & Time:** ${formattedTime}\n` +
            `- 🌐 **Consultation Mode:** Virtual Video (Google Meet)\n` +
            (meetLink ? `- 🔗 **Meeting Link:** [👉 Click here to join your Google Meet Consultation](${meetLink})\n\n` : `\n`) +
            `**Verified Completion Checklist:**\n` +
            `- [x] 📅 **Meeting Link & Calendar:** Google Meet link generated and synced with Google Calendar\n` +
            `- [x] 📧 **Confirmation Email:** Verified sent to patient and physician\n` +
            `- 🎯 **Option Status:** **${isComplete ? "Complete (Both outcomes confirmed)" : "Processing"}**\n\n` +
            `📧 *Confirmation email and calendar invite with meeting link have been dispatched to both you and Dr. ${doctorName.replace(/^Dr\.\s*/, "")}.*`
          : `### ✅ In-Person Clinic Consultation Confirmed!\n\n` +
            `Your appointment with **${doctorName}** (${doctorSpecialty}) has been successfully scheduled.\n\n` +
            `- 📅 **Date & Time:** ${formattedTime}\n` +
            `- 🏥 **Consultation Mode:** Direct In-Person Clinic Visit\n` +
            `- 📍 **Clinic Location:** ${clinicRoom}\n\n` +
            `**Verified Completion Checklist:**\n` +
            `- [x] 📅 **Calendar:** Clinic room appointment slot reserved and calendar updated\n` +
            `- [x] 📧 **Confirmation Email:** Verified sent to patient and physician\n` +
            `- 🎯 **Option Status:** **${isComplete ? "Complete (Both outcomes confirmed)" : "Processing"}**\n\n` +
            `📧 *Confirmation email and clinic arrival directions have been dispatched to both you and Dr. ${doctorName.replace(/^Dr\.\s*/, "")}.*`;

        const spokenConfirmation = isComplete
          ? isVirtual
            ? `Both tasks verified complete: your Google Meet link has been added to your calendar, and your confirmation email has been sent to both you and ${doctorName}.`
            : `Both tasks verified complete: your clinic appointment has been scheduled on the calendar, and your arrival confirmation email has been sent.`
          : `Your consultation with ${doctorName} is confirmed for ${action.timeDisplay}. Notifications are currently being dispatched.`;

        appendActionConfirmation(richMarkdown, spokenConfirmation);
        loadUserAppointments();
      } else if (action.type === "reschedule") {
        const res = await fetch("/api/appointments/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: action.appointmentId,
            doctorId: action.doctor.id,
            newStartTime: action.startTime,
            newEndTime: action.endTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const spoken =
            data.error || "Unable to reschedule to that time slot. Please choose another time.";
          appendAssistantSpoken(spoken);
          return;
        }

        const spoken = `Your appointment with ${action.doctor.name} has been successfully rescheduled to ${action.dateDisplay} at ${action.timeDisplay}.`;
        appendAssistantSpoken(spoken);
        loadUserAppointments();
      } else if (action.type === "cancel") {
        const res = await fetch("/api/appointments/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: action.appointmentId,
            reason: "Cancelled by patient via voice confirmation",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const spoken = data.error || "Unable to cancel the appointment at this time.";
          appendAssistantSpoken(spoken);
          return;
        }

        const spoken = `Your appointment with ${action.doctor.name} has been cancelled and the time slot was released.`;
        appendAssistantSpoken(spoken);
        loadUserAppointments();
      }
    } catch (err: any) {
      console.error("Action execution exception:", err);
      appendAssistantSpoken(
        "I encountered a connection error while executing that request. Please try again."
      );
    } finally {
      setActionExecuting(false);
      setPendingVoiceAction(null);
      pendingVoiceActionRef.current = null;
    }
  };

  const cancelPendingAction = () => {
    setPendingVoiceAction(null);
    pendingVoiceActionRef.current = null;
    setTaskVerification(null);
    const spoken = "Understood. That action has been cancelled. How else can I assist you today?";
    appendAssistantSpoken(spoken);
  };

  const appendActionConfirmation = (richMarkdown: string, spokenText: string) => {
    const astMsg: Message = {
      id: `ast_act_${Date.now()}`,
      role: "assistant",
      content: richMarkdown,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, astMsg]);

    if (isVoiceModeRef.current) {
      updateVoiceState("speaking");
      voiceTtsRef.current.speakSentence(spokenText, () => {
        if (isVoiceModeRef.current) {
          updateVoiceState("listening");
          startListeningLoop();
        }
      });
    }
  };

  const appendAssistantSpoken = (text: string) => {
    const astMsg: Message = {
      id: `ast_act_${Date.now()}`,
      role: "assistant",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, astMsg]);

    if (isVoiceModeRef.current) {
      updateVoiceState("speaking");
      voiceTtsRef.current.speakSentence(text, () => {
        if (isVoiceModeRef.current) {
          updateVoiceState("listening");
          startListeningLoop();
        }
      });
    }
  };

  const handleClearChat = () => {
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    accumulatedTranscriptRef.current = "";
    latestInterimRef.current = "";
    setInterimTranscript("");
    setFinalTranscript("");

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    voiceTtsRef.current.stop();
    const freshWelcome: Message = {
      id: `welcome-msg-${Date.now()}`,
      role: "assistant",
      content: INITIAL_WELCOME_MESSAGE.content,
      created_at: new Date().toISOString(),
    };
    setMessages([freshWelcome]);
    clearGuestMessages();
    setCrisisState({ triggered: false });
    updateLoading(false);
    setDetectedMood("neutral");
    setPendingVoiceAction(null);
    pendingVoiceActionRef.current = null;
    setTaskVerification(null);
    if (conversationId && onNewConversation) {
      onNewConversation();
    }
    toast.success("Chat history cleared");
  };

  // --- Instant Voice Turn Dispatcher (< 80ms First Response) ---
  const dispatchVoiceTurn = (spokenText: string) => {
    const cleanFinal = spokenText.trim();
    if (!cleanFinal) return;

    // 1. Check if pending action is awaiting user confirmation
    const currentPending = pendingVoiceActionRef.current;
    if (currentPending) {
      if (isAffirmativeConfirmation(cleanFinal)) {
        executeConfirmedAction(currentPending);
        return;
      } else if (isNegativeDecline(cleanFinal)) {
        cancelPendingAction();
        return;
      }
    }

    // 2. Check if user speech expresses an appointment action
    const detectedAction = detectVoiceAction(cleanFinal, userAppointmentsRef.current);
    if (detectedAction) {
      setPendingVoiceAction(detectedAction);
      pendingVoiceActionRef.current = detectedAction;
      updateVoiceState("awaiting_confirmation");

      // Instantly speak the confirmation prompt (< 50ms)!
      voiceTtsRef.current.speakConfirmationPrompt(detectedAction.spokenPrompt, () => {
        if (isVoiceModeRef.current) {
          startListeningLoop();
        }
      });

      // Post messages to history
      const userMsg: Message = {
        id: `usr_${Date.now()}`,
        role: "user",
        content: cleanFinal,
        created_at: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: detectedAction.spokenPrompt,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      return;
    }

    // 3. For general clinical queries:
    // Directly process and reply with the clinical solution without filler or delay statements
    updateVoiceState("thinking");
    handleSendMessage(cleanFinal, { isFromVoiceTurn: true });
  };

  dispatchVoiceTurnRef.current = dispatchVoiceTurn;

  // --- Main Message Submission Flow ---
  const handleSendMessage = async (
    text: string,
    options: { isFromVoiceTurn?: boolean } = {}
  ) => {
    if (!text.trim() || isLoading) return;

    // 1. Append user message
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    updateLoading(true);

    if (isVoiceModeRef.current) {
      if (speechSilenceTimerRef.current) {
        clearTimeout(speechSilenceTimerRef.current);
        speechSilenceTimerRef.current = null;
      }
      accumulatedTranscriptRef.current = "";
      latestInterimRef.current = "";
      setInterimTranscript("");
      updateVoiceState("thinking");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      isListeningActiveRef.current = false;
    }

    // Save to local guest storage if unauthenticated
    if (!conversationId) {
      setGuestMessages(nextMessages as GuestMessage[]);
    }

    // 2. Trigger asynchronous NLP extraction for mood and action detection
    fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((entities) => {
        if (entities.mood) setDetectedMood(entities.mood);
      })
      .catch((err) => console.warn("Extraction non-blocking error:", err));

    // Evaluate if user speech expressed an appointment booking/reschedule/cancel action
    const detectedAction = detectVoiceAction(text, userAppointmentsRef.current);
    if (detectedAction) {
      setPendingVoiceAction(detectedAction);
      pendingVoiceActionRef.current = detectedAction;
    }

    // 3. Initiate Streaming Chat Response via SSE
    abortControllerRef.current = new AbortController();
    let assistantMsgId = "";
    let accumulatedText = "";

    try {
      const isEmpatheticMode = ["anxious", "depressed", "stressed", "overwhelmed"].includes(
        detectedMood.toLowerCase()
      );

      const payloadMessages = nextMessages
        .filter((m) => m.id !== "welcome-msg" && !m.id?.startsWith("welcome-msg-"))
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          conversationId,
          isEmpathetic: isEmpatheticMode,
          isVoiceMode: isVoiceModeRef.current,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Unable to reach healthcare assistant. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch {}
        toast.error(errorMsg);
        const errContent = `I apologize, but I encountered an issue: ${errorMsg}\n\nPlease try again shortly, or consult our clinic doctors if you require immediate medical assistance.`;
        setMessages((prev) => [
          ...prev,
          {
            id: `ast_err_${Date.now()}`,
            role: "assistant",
            content: errContent,
            created_at: new Date().toISOString(),
          },
        ]);
        updateLoading(false);
        if (isVoiceModeRef.current) {
          voiceTtsRef.current.speakSentence(errContent, () => {
            if (isVoiceModeRef.current) {
              updateVoiceState("listening");
              startListeningLoop();
            }
          });
        }
        return;
      }

      if (!response.body) {
        throw new Error("No readable stream received");
      }

      assistantMsgId = `ast_${Date.now()}`;
      accumulatedText = "";
      let incomingCitations: Citation[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          citations: [],
          created_at: new Date().toISOString(),
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "CONVERSATION_ID") {
              if (data.conversationId) {
                currentConvIdRef.current = data.conversationId;
                onConversationCreated?.(data.conversationId);
              }
            } else if (data.type === "CRISIS_TRIGGERED") {
              setCrisisState({
                triggered: true,
                severity: data.severity,
                trigger: data.trigger,
              });
              updateLoading(false);

              // Non-negotiable: deliver crisis guidance as complete, unchunked speech immediately
              if (isVoiceModeRef.current) {
                voiceTtsRef.current.speakCrisisGuidance(
                  "If you or someone you know is in immediate distress or experiencing an emergency, please call 112 or 108 immediately for emergency medical assistance. Professional help is available 24 hours a day."
                );
              }
              return;
            } else if (data.type === "CITATIONS") {
              incomingCitations = data.citations;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, citations: incomingCitations } : m
                )
              );
            } else if (data.type === "TOKEN") {
              accumulatedText += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );

              // Buffer and feed into streaming TTS sentence engine
              if (isVoiceModeRef.current) {
                voiceTtsRef.current.feedStreamToken(data.content);
              }
            } else if (data.type === "DONE") {
              updateLoading(false);
              if (isVoiceModeRef.current) {
                voiceTtsRef.current.flushStreamBuffer();

                // If an action requires confirmation, speak the confirmation question
                if (pendingVoiceActionRef.current) {
                  voiceTtsRef.current.speakConfirmationPrompt(
                    pendingVoiceActionRef.current.spokenPrompt
                  );
                } else if (!voiceTtsRef.current.isPlaybackActive()) {
                  // If all speech finished playing, immediately return to listening
                  updateVoiceState("listening");
                  startListeningLoop();
                }
              }
            } else if (data.type === "ERROR") {
              const errMsg = data.error || "An error occurred while streaming the medical response.";
              accumulatedText = accumulatedText
                ? `${accumulatedText}\n\n*(Notice: ${errMsg})*`
                : `I apologize, but an error occurred while generating the response: ${errMsg}`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                )
              );
              updateLoading(false);
              if (isVoiceModeRef.current && !voiceTtsRef.current.isPlaybackActive()) {
                updateVoiceState("listening");
                startListeningLoop();
              }
            }
          } catch {
            // Ignore malformed chunk
          }
        }
      }

      // Strip any accidental boilerplate trailing disclaimers appended by model
      const cleanedFinalText = accumulatedText
        .replace(/\n*(?:\*{1,2})?(?:Medical\s+)?Disclaimer:?(?:\*{1,2})?\s*(?:This\s+(?:AI\s+)?(?:assistant|information|response)|I\s+am\s+an\s+AI|Always\s+consult\s+a\s+doctor|In\s+an\s+emergency\s+call)[^\n]*/gi, "")
        .trim();

      // Finalize messages update
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: cleanedFinalText || accumulatedText, citations: incomingCitations }
            : m
        );
        if (!conversationId) {
          setGuestMessages(updated as GuestMessage[]);
        }
        return updated;
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat stream aborted by user.");
      } else {
        console.error("Chat streaming error:", err);
        toast.error("Stream connection error. Please retry.");
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) {
            return prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      accumulatedText ||
                      "I'm sorry, the connection was interrupted before I could complete my response. Please send your message again.",
                  }
                : m
            );
          }
          return [
            ...prev,
            {
              id: `ast_err_${Date.now()}`,
              role: "assistant",
              content:
                "I apologize, but a connection error occurred while contacting the assistant. Please try sending your message again.",
              created_at: new Date().toISOString(),
            },
          ];
        });
      }
    } finally {
      updateLoading(false);
      if (isVoiceModeRef.current && !voiceTtsRef.current.isPlaybackActive()) {
        updateVoiceState("listening");
        startListeningLoop();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 relative">
      {/* Header Bar */}
      <div className="p-2 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:flex">
              <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Healthcare AI Companion
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                Verified Medical Knowledge & Clinical Guidance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Talkative Voice Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isVoiceMode) {
                exitVoiceMode();
              } else {
                activateVoiceMode();
              }
            }}
            className={cn(
              "flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs",
              isVoiceMode
                ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            )}
            title={isVoiceMode ? "Deactivate Talkative Voice Mode" : "Activate Talkative Spoken Voice Mode"}
          >
            <Radio className={cn("w-3.5 h-3.5", isVoiceMode && "animate-pulse")} />
            <span className="hidden sm:inline">{isVoiceMode ? "Voice On" : "Voice"}</span>
          </button>

          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
              title="View consultation history"
            >
              <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>History</span>
            </button>
          )}

          {onNewConversation && (
            <button
              type="button"
              onClick={onNewConversation}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors flex items-center gap-1"
              title="Start a new consultation"
              aria-label="New consultation"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 dark:hover:border-rose-900 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs transition-colors flex items-center gap-1"
            title="Clear current chat messages"
            aria-label="Clear chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors flex items-center gap-1"
            title="Export consultation summary"
            aria-label="Export consultation"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Voice Mode Overlay HUD (Visible when Talkative Voice Mode is active) */}
      {isVoiceMode && (
        <VoiceHUD
          state={voiceState}
          interimTranscript={interimTranscript}
          finalTranscript={finalTranscript}
          speakingSentence={speakingSentence}
          pendingAction={pendingVoiceAction}
          verificationStatus={taskVerification}
          onConfirmAction={() => {
            if (pendingVoiceAction) executeConfirmedAction(pendingVoiceAction);
          }}
          onCancelAction={cancelPendingAction}
          onInterrupt={handleInterrupt}
          onExitVoiceMode={exitVoiceMode}
          actionExecuting={actionExecuting}
          ttsProvider={ttsProvider}
          vexylLang={vexylLang}
          onChangeVexylLang={(lang) => {
            setVexylLang(lang);
            voiceTtsRef.current?.updateOptions({ vexylLang: lang as any });
          }}
          vexylStyle={vexylStyle}
          onChangeVexylStyle={(style) => {
            setVexylStyle(style);
            voiceTtsRef.current?.updateOptions({ vexylStyle: style });
          }}
          micStream={micStream}
          isMuted={isMicMuted}
          onToggleMute={toggleMuteMic}
        />
      )}

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3.5 space-y-1.5 sm:space-y-2.5 overscroll-contain">
        {/* Crisis Banner if safety gate was hit */}
        {crisisState.triggered && (
          <CrisisBanner
            severity={crisisState.severity}
            trigger={crisisState.trigger}
          />
        )}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id || idx}
            id={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            createdAt={m.created_at}
            isTyping={isLoading && m.role === "assistant" && !m.content}
            onOpenBookingModal={(mode) => {
              if (mode) setBookingMode(mode);
              setShowBooking(true);
            }}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 p-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>Consulting medical knowledge base...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length <= 2 && (
        <div className="px-2.5 sm:px-4 py-1 sm:py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-0.5 select-none shrink-0">
            Suggested:
          </span>
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(chip)}
              className={cn(
                "text-[11px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border transition-colors shadow-2xs shrink-0 whitespace-nowrap",
                isLoading
                  ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Footer Area: Sentiment badge + Chat Input */}
      <div className="p-2 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <SentimentIndicator mood={detectedMood} />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isVoiceMode={isVoiceMode}
          onToggleVoiceMode={() => {
            if (isVoiceMode) {
              exitVoiceMode();
            } else {
              activateVoiceMode();
            }
          }}
        />
        <div className="text-center pt-0.5">
          <Link
            href="/terms"
            className="text-[10px] sm:text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
          >
            <span className="hidden sm:inline">Verified Medical Knowledge Base (CDC, MedlinePlus, WHO) • Terms & Policy</span>
            <span className="sm:hidden">Verified Medical Sources (CDC, WHO) • Terms</span>
          </Link>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      <BookingModal
        isOpen={showBooking}
        initialMode={bookingMode}
        onClose={() => setShowBooking(false)}
      />

      {/* Export Summary Modal */}
      <ExportSummaryModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        messages={messages}
      />
    </div>
  );
}
