"use client";

import {
  synthesizeWithVexylWs,
  checkVexylHealth,
  type VexylLanguageCode,
  type VexylVoiceStyle,
} from "@/lib/vexylTtsClient";

/**
 * Text-to-Speech (TTS) Engine with Streaming Sentence Chunking,
 * Dual Provider Support (VEXYL-TTS Neural Indic/English + Web Speech API Fallback),
 * Audio Queue Management, Barge-In Interruption, and Spoken Safety Disclaimers.
 */

export interface VoiceTtsOptions {
  onStartSpeaking?: () => void;
  onSentenceSpoken?: (sentence: string) => void;
  onFinishSpeaking?: () => void;
  onError?: (error: any) => void;
  onProviderChange?: (provider: "vexyl" | "web-speech") => void;
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice | null;
  ttsProvider?: "auto" | "vexyl" | "web-speech";
  vexylLang?: VexylLanguageCode;
  vexylStyle?: VexylVoiceStyle;
  vexylSpeaker?: string;
}

export const SPOKEN_MEDICAL_DISCLAIMER =
  "Provides general health information only; for emergencies call 112 or 108.";

export class VoiceTtsManager {
  private queue: string[] = [];
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private tokenBuffer = "";
  private hasSpokenDisclaimerSession = false;
  private options: VoiceTtsOptions;
  private vexylAvailable: boolean | null = null;
  private activeProvider: "vexyl" | "web-speech" = "web-speech";

  constructor(options: VoiceTtsOptions = {}) {
    this.options = {
      rate: 0.98, // Natural, warm human speaking pace
      pitch: 1.0,
      ttsProvider: "auto",
      vexylLang: "en-IN",
      vexylStyle: "warm",
      ...options,
    };
  }

  public async detectVexylAvailability(): Promise<boolean> {
    if (this.options.ttsProvider === "web-speech") {
      this.vexylAvailable = false;
      this.activeProvider = "web-speech";
      this.options.onProviderChange?.("web-speech");
      return false;
    }

    if (this.vexylAvailable !== null) {
      return this.vexylAvailable;
    }

    try {
      const isHealthy = await checkVexylHealth(1500);
      this.vexylAvailable = isHealthy;
      this.activeProvider = isHealthy ? "vexyl" : "web-speech";
      this.options.onProviderChange?.(this.activeProvider);
      return isHealthy;
    } catch {
      this.vexylAvailable = false;
      this.activeProvider = "web-speech";
      this.options.onProviderChange?.("web-speech");
      return false;
    }
  }

  public getActiveProvider(): "vexyl" | "web-speech" {
    return this.activeProvider;
  }

  public updateOptions(options: Partial<VoiceTtsOptions>) {
    this.options = { ...this.options, ...options };
    if (options.ttsProvider === "web-speech") {
      this.activeProvider = "web-speech";
      this.options.onProviderChange?.("web-speech");
    } else if (options.ttsProvider === "vexyl") {
      this.activeProvider = "vexyl";
      this.options.onProviderChange?.("vexyl");
    }
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const hasSynth = "speechSynthesis" in window;
    const hasUtterance =
      "SpeechSynthesisUtterance" in window || typeof (globalThis as any).SpeechSynthesisUtterance !== "undefined";
    const hasAudio = typeof Audio !== "undefined";
    return Boolean((hasSynth && hasUtterance) || hasAudio);
  }

  public getHasSpokenDisclaimer(): boolean {
    return this.hasSpokenDisclaimerSession;
  }

  public setHasSpokenDisclaimer(val: boolean) {
    this.hasSpokenDisclaimerSession = val;
  }

  public isPlaybackActive(): boolean {
    return this.isSpeaking || this.queue.length > 0 || this.tokenBuffer.trim().length > 0;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public hasPendingBuffer(): boolean {
    return this.tokenBuffer.trim().length > 0;
  }

  /**
   * Resets session state.
   */
  public resetSession() {
    this.stop();
    this.tokenBuffer = "";
    this.hasSpokenDisclaimerSession = false;
  }

  /**
   * Cancels any active playback immediately (barge-in / interrupt).
   */
  public stop() {
    this.queue = [];
    this.tokenBuffer = "";
    this.isSpeaking = false;

    // Stop VEXYL-TTS HTML Audio if playing
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    // Stop Web Speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("speechSynthesis.cancel error:", e);
      }
    }
    this.currentUtterance = null;
  }

  /**
   * Speaks an urgent emergency crisis message as a complete, deliberate,
   * unchunked utterance with immediate priority.
   */
  public speakCrisisGuidance(text: string, onEnd?: () => void) {
    this.stop();
    this.queueUtterance(text, { priority: true, onEnd });
  }

  /**
   * Speaks an action confirmation question as a complete, unchunked sentence.
   */
  public speakConfirmationPrompt(text: string, onEnd?: () => void) {
    this.stop();
    this.queueUtterance(text, { priority: true, onEnd });
  }

  /**
   * Queues a standalone complete sentence to be spoken.
   */
  public speakSentence(text: string, onEnd?: () => void) {
    if (!text || !text.trim()) return;
    this.queueUtterance(text.trim(), { priority: false, onEnd });
  }

  /**
   * Strips markdown artifacts, URLs, and formatting so spoken audio is natural.
   */
  public static cleanTextForSpeech(raw: string): string {
    if (!raw) return "";
    return raw
      .replace(/\[\d+\](?:\s*,\s*\[\d+\])*/g, "") // remove [1], [2] citations
      .replace(/https?:\/\/\S+/gi, "") // remove raw URLs
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links -> link text
      .replace(/[*_#`~>]/g, "") // strip markdown symbols
      .replace(/\n+/g, ". ") // replace newlines with sentence pauses
      .replace(/\s{2,}/g, " ") // collapse multiple spaces
      .trim();
  }

  /**
   * Ingests incoming SSE tokens incrementally, buffers them,
   * and dispatches completed sentences to TTS without waiting for the full response.
   */
  public feedStreamToken(token: string) {
    this.tokenBuffer += token;

    // For the initial opening sentence, split on first clause (comma, colon, semicolon)
    // after 4 words to start voice playback within milliseconds instead of waiting for a period!
    if (!this.isSpeaking && this.queue.length === 0) {
      const clauseMatch = /([,;:—]+[\s\n]+)/.exec(this.tokenBuffer);
      if (clauseMatch) {
        const candidate = this.tokenBuffer.slice(0, clauseMatch.index).trim();
        const wordCount = candidate.split(/\s+/).length;
        if (wordCount >= 4) {
          const splitIdx = clauseMatch.index + clauseMatch[0].length;
          const clauseText = this.tokenBuffer.slice(0, splitIdx).trim();
          this.tokenBuffer = this.tokenBuffer.slice(splitIdx);
          const cleaned = VoiceTtsManager.cleanTextForSpeech(clauseText);
          if (cleaned.length > 2) {
            this.queueUtterance(cleaned);
            return;
          }
        }
      }
    }

    // Sentence splitting boundary regex:
    // Matches '.', '!', or '?' followed by a space or newline
    const sentenceBoundaryRegex = /([.!?]+[\s\n]+)/g;

    let match: RegExpExecArray | null;
    let splitIndex = -1;

    while ((match = sentenceBoundaryRegex.exec(this.tokenBuffer)) !== null) {
      const candidateBeforePunct = this.tokenBuffer.slice(0, match.index).trim();
      const lastWord = candidateBeforePunct.split(/\s+/).pop()?.toLowerCase();

      // Avoid premature splits on common medical/honorific abbreviations
      if (lastWord && ["dr", "md", "mr", "mrs", "ms", "vs", "eg", "ie", "ps", "approx", "temp"].includes(lastWord)) {
        continue;
      }

      splitIndex = match.index + match[0].length;
      break;
    }

    if (splitIndex !== -1) {
      const sentenceCandidate = this.tokenBuffer.slice(0, splitIndex).trim();
      this.tokenBuffer = this.tokenBuffer.slice(splitIndex);

      const cleaned = VoiceTtsManager.cleanTextForSpeech(sentenceCandidate);
      if (cleaned.length > 2) {
        this.queueUtterance(cleaned);
      }
    }
  }

  /**
   * Called when SSE stream is DONE to flush any remaining text in the buffer.
   */
  public flushStreamBuffer() {
    if (this.tokenBuffer.trim()) {
      const cleaned = VoiceTtsManager.cleanTextForSpeech(this.tokenBuffer);
      this.tokenBuffer = "";
      if (cleaned.length > 1) {
        this.queueUtterance(cleaned);
      }
    }
  }

  /**
   * Queues an utterance and starts the queue consumer if idle.
   */
  private queueUtterance(
    text: string,
    options: { priority?: boolean; onEnd?: () => void } = {}
  ) {
    if (!this.isSupported()) {
      options.onEnd?.();
      return;
    }

    if (options.priority) {
      this.queue.unshift(text);
    } else {
      this.queue.push(text);
    }

    if (!this.isSpeaking) {
      this.processQueue(options.onEnd);
    }
  }

  /**
   * Processes the next sentence in the queue.
   * Tries VEXYL-TTS neural speech first (if enabled/available);
   * seamlessly falls back to Web Speech API speechSynthesis on any failure.
   */
  private async processQueue(onEndCallback?: () => void) {
    if (!this.isSupported() || this.queue.length === 0) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.currentAudio = null;
      this.options.onFinishSpeaking?.();
      onEndCallback?.();
      return;
    }

    const nextSentence = this.queue.shift();
    if (!nextSentence || !nextSentence.trim()) {
      this.processQueue(onEndCallback);
      return;
    }

    const shouldUseVexyl =
      this.options.ttsProvider === "vexyl" ||
      (this.options.ttsProvider !== "web-speech" && this.vexylAvailable === true);

    if (shouldUseVexyl) {
      try {
        const audioResult = await synthesizeWithVexylWs(nextSentence, {
          lang: this.options.vexylLang || "en-IN",
          style: this.options.vexylStyle || "warm",
          speaker: this.options.vexylSpeaker,
          timeoutMs: 4000,
        });

        this.isSpeaking = true;
        this.activeProvider = "vexyl";
        this.options.onProviderChange?.("vexyl");

        const audio = new Audio(audioResult.audioUrl);
        this.currentAudio = audio;

        audio.onplay = () => {
          this.options.onStartSpeaking?.();
          this.options.onSentenceSpoken?.(nextSentence);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioResult.audioUrl);
          this.currentAudio = null;
          if (this.queue.length > 0) {
            this.processQueue(onEndCallback);
          } else {
            this.isSpeaking = false;
            this.options.onFinishSpeaking?.();
            onEndCallback?.();
          }
        };

        audio.onerror = (err) => {
          console.warn("VEXYL audio playback error, falling back to Web Speech:", err);
          URL.revokeObjectURL(audioResult.audioUrl);
          this.currentAudio = null;
          this.speakViaWebSpeech(nextSentence, onEndCallback);
        };

        await audio.play();
        return;
      } catch (vexylErr) {
        console.warn("VEXYL-TTS synthesis unavailable, falling back to Web Speech API:", vexylErr);
        this.vexylAvailable = false;
        this.activeProvider = "web-speech";
        this.options.onProviderChange?.("web-speech");
        // Fall back to Web Speech
      }
    }

    // Fallback: Web Speech API
    this.speakViaWebSpeech(nextSentence, onEndCallback);
  }

  /**
   * Dispatches sentence via browser SpeechSynthesis.
   */
  private speakViaWebSpeech(nextSentence: string, onEndCallback?: () => void) {
    try {
      const UtteranceConstructor =
        (typeof window !== "undefined" && (window as any).SpeechSynthesisUtterance) ||
        (typeof (globalThis as any).SpeechSynthesisUtterance !== "undefined"
          ? (globalThis as any).SpeechSynthesisUtterance
          : null);

      if (!UtteranceConstructor || typeof window === "undefined" || !("speechSynthesis" in window)) {
        this.isSpeaking = false;
        this.processQueue(onEndCallback);
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          try {
            window.speechSynthesis.resume();
          } catch {}
        }
      }

      const utterance = new UtteranceConstructor(nextSentence);
      utterance.rate = this.options.rate || 0.98;
      utterance.pitch = this.options.pitch || 1.0;
      utterance.lang = "en-US";

      if (this.options.voice) {
        utterance.voice = this.options.voice;
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            // Rank by lifelike human neural prosody: Microsoft Online (Natural) -> Google -> Apple Enhanced/Premium -> Standard English
            const naturalVoice =
              voices.find(
                (v) =>
                  v.lang.startsWith("en") &&
                  (v.name.includes("Online (Natural)") ||
                    v.name.includes("Neural") ||
                    v.name.includes("Enhanced") ||
                    v.name.includes("Premium"))
              ) ||
              voices.find(
                (v) =>
                  v.lang.startsWith("en") &&
                  (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
              ) ||
              voices.find((v) => v.lang.startsWith("en"));
            if (naturalVoice) {
              utterance.voice = naturalVoice;
            }
          }
        } catch {}
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.options.onStartSpeaking?.();
        this.options.onSentenceSpoken?.(nextSentence);
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (this.queue.length > 0) {
          this.processQueue(onEndCallback);
        } else {
          this.isSpeaking = false;
          this.options.onFinishSpeaking?.();
          onEndCallback?.();
        }
      };

      utterance.onerror = (err: any) => {
        console.warn("TTS utterance error:", err);
        this.currentUtterance = null;
        this.isSpeaking = false;
        this.options.onError?.(err);
        this.processQueue(onEndCallback);
      };

      this.isSpeaking = true;
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("speechSynthesis.speak exception:", e);
      this.isSpeaking = false;
      this.processQueue(onEndCallback);
    }
  }
}
