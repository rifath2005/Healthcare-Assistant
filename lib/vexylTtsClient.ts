/**
 * VEXYL-TTS Client Integration
 * Wraps vexyl-ai/vexyl-tts (ai4bharat/indic-parler-tts) WebSocket & REST synthesis.
 * Provides natural, humanized Indian language and English neural voice synthesis
 * with warm empathetic bedside tone for healthcare assistance.
 */

export type VexylLanguageCode =
  | "en-IN"
  | "hi-IN"
  | "ml-IN"
  | "ta-IN"
  | "te-IN"
  | "kn-IN"
  | "bn-IN"
  | "gu-IN"
  | "mr-IN"
  | "pa-IN"
  | "or-IN"
  | "as-IN"
  | "ur-IN"
  | "ne-IN"
  | "sa-IN"
  | "brx-IN"
  | "doi-IN"
  | "kok-IN"
  | "mai-IN"
  | "mni-IN"
  | "sat-IN"
  | "sd-IN"
  | "en-US"
  | "en-GB";

export type VexylVoiceStyle = "default" | "warm" | "formal";

export interface VexylSpeaker {
  name: string;
  gender: "F" | "M";
}

export const VEXYL_SPEAKERS: Record<string, VexylSpeaker[]> = {
  "ml-IN": [{ name: "Anjali", gender: "F" }, { name: "Harish", gender: "M" }],
  "hi-IN": [{ name: "Divya", gender: "F" }, { name: "Rohit", gender: "M" }],
  "ta-IN": [{ name: "Kavitha", gender: "F" }, { name: "Jaya", gender: "F" }],
  "te-IN": [{ name: "Lalitha", gender: "F" }, { name: "Prakash", gender: "M" }],
  "kn-IN": [{ name: "Anu", gender: "F" }, { name: "Suresh", gender: "M" }],
  "bn-IN": [{ name: "Aditi", gender: "F" }, { name: "Arjun", gender: "M" }],
  "gu-IN": [{ name: "Neha", gender: "F" }, { name: "Yash", gender: "M" }],
  "mr-IN": [{ name: "Sunita", gender: "F" }, { name: "Sanjay", gender: "M" }],
  "en-IN": [{ name: "Mary", gender: "F" }, { name: "Thoma", gender: "M" }],
  "pa-IN": [{ name: "Divjot", gender: "F" }, { name: "Gurpreet", gender: "M" }],
  "or-IN": [{ name: "Debjani", gender: "F" }, { name: "Manas", gender: "M" }],
  "as-IN": [{ name: "Sita", gender: "F" }, { name: "Amit", gender: "M" }],
  "ur-IN": [{ name: "Zainab", gender: "F" }, { name: "Rohit", gender: "M" }],
  "ne-IN": [{ name: "Amrita", gender: "F" }, { name: "Ram", gender: "M" }],
  "sa-IN": [{ name: "Vasudha", gender: "F" }, { name: "Aryan", gender: "M" }],
  "brx-IN": [{ name: "Bimala", gender: "F" }, { name: "Bikram", gender: "M" }],
  "doi-IN": [{ name: "Meena", gender: "F" }, { name: "Vikram", gender: "M" }],
  "kok-IN": [{ name: "Priya", gender: "F" }, { name: "Kaustubh", gender: "M" }],
  "mai-IN": [{ name: "Shruti", gender: "F" }, { name: "Saurabh", gender: "M" }],
  "mni-IN": [{ name: "Leima", gender: "F" }, { name: "Tomba", gender: "M" }],
  "sat-IN": [{ name: "Sumitra", gender: "F" }, { name: "Raju", gender: "M" }],
  "sd-IN": [{ name: "Hema", gender: "F" }, { name: "Mohan", gender: "M" }],
};

export const VEXYL_HEALTHCARE_TONES: Record<VexylVoiceStyle, string> = {
  warm: "warm and empathetic tone, slightly slow-paced for clarity and reassuring bedside presence",
  default: "calm, clear, and professional tone with a moderate speed",
  formal: "formal, neutral clinical tone with precise medical diction and moderate speed",
};

export interface VexylSynthesizeOptions {
  lang?: VexylLanguageCode;
  style?: VexylVoiceStyle;
  speaker?: string;
  description?: string;
  timeoutMs?: number;
}

export interface VexylAudioResult {
  audioBlob: Blob;
  audioUrl: string;
  sampleRate: number;
  latencyMs?: number;
}

export function buildVexylDescription(
  lang: VexylLanguageCode,
  speakerName?: string,
  style: VexylVoiceStyle = "warm"
): string {
  const speakers = VEXYL_SPEAKERS[lang] || VEXYL_SPEAKERS["en-IN"];
  const speaker = speakerName || (style === "formal" ? speakers[1]?.name : speakers[0]?.name) || "Mary";
  const tone = VEXYL_HEALTHCARE_TONES[style] || VEXYL_HEALTHCARE_TONES["warm"];
  return `${speaker} speaks in a ${tone}. The recording is of very high quality with no background noise.`;
}

export function getVexylWsUrl(): string {
  if (typeof window !== "undefined") {
    return (
      (window as any).__VEXYL_TTS_WS_URL__ ||
      process.env.NEXT_PUBLIC_VEXYL_TTS_WS_URL ||
      "ws://127.0.0.1:8092"
    );
  }
  return process.env.VEXYL_TTS_WS_URL || "ws://127.0.0.1:8092";
}

export function getVexylHttpUrl(): string {
  if (typeof window !== "undefined") {
    return (
      (window as any).__VEXYL_TTS_HTTP_URL__ ||
      process.env.NEXT_PUBLIC_VEXYL_TTS_HTTP_URL ||
      "http://127.0.0.1:8092"
    );
  }
  return process.env.VEXYL_TTS_HTTP_URL || "http://127.0.0.1:8092";
}

export function isLocalVexylTarget(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

let cachedHealthResult: { available: boolean; timestamp: number } | null = null;

export function clearVexylHealthCache() {
  cachedHealthResult = null;
}

/**
 * Checks if VEXYL-TTS server is configured and responding to /health.
 * Caches result to avoid repetitive network fetch failures in browser console.
 * Gracefully defaults to Web Speech API in cloud/HTTPS production environments.
 */
export async function checkVexylHealth(timeoutMs = 1200): Promise<boolean> {
  // If previously checked within last 5 minutes, avoid spamming console
  if (cachedHealthResult && Date.now() - cachedHealthResult.timestamp < 300000) {
    return cachedHealthResult.available;
  }

  const httpUrl = getVexylHttpUrl();

  // In cloud/HTTPS production, skip fetching http://127.0.0.1 to prevent browser mixed-content security blocks
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    if (isHttps && isLocalVexylTarget(httpUrl)) {
      cachedHealthResult = { available: false, timestamp: Date.now() };
      return false;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${httpUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      cachedHealthResult = { available: false, timestamp: Date.now() };
      return false;
    }
    const data = await res.json();
    const ok = data.status === "ok" || data.status === "available" || Boolean(data.model);
    cachedHealthResult = { available: ok, timestamp: Date.now() };
    return ok;
  } catch {
    clearTimeout(timer);
    cachedHealthResult = { available: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Synthesizes text via VEXYL-TTS WebSocket endpoint.
 */
export async function synthesizeWithVexylWs(
  text: string,
  options: VexylSynthesizeOptions = {}
): Promise<VexylAudioResult> {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty for synthesis");
  }

  const wsUrl = getVexylWsUrl();
  const lang = options.lang || "en-IN";
  const style = options.style || "warm";
  const description = options.description || buildVexylDescription(lang, options.speaker, style);
  const timeoutMs = options.timeoutMs || 10000;

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;
    let isSettled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };

    timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        reject(new Error("VEXYL-TTS WebSocket timeout"));
      }
    }, timeoutMs);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const payload = {
          type: "synthesize",
          text: text.trim(),
          lang,
          style,
          description,
          request_id: requestId,
        };
        ws?.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            // Server ready confirmation; synthesis message was sent on open
            return;
          }

          if (msg.type === "audio" && msg.audio_b64) {
            isSettled = true;
            cleanup();

            const binaryStr = atob(msg.audio_b64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }

            const audioBlob = new Blob([bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(audioBlob);

            resolve({
              audioBlob,
              audioUrl,
              sampleRate: msg.sample_rate || 22050,
              latencyMs: msg.latency_ms,
            });
          } else if (msg.type === "error") {
            isSettled = true;
            cleanup();
            reject(new Error(msg.message || "VEXYL-TTS error response"));
          }
        } catch (parseErr) {
          isSettled = true;
          cleanup();
          reject(parseErr);
        }
      };

      ws.onerror = (err) => {
        if (!isSettled) {
          isSettled = true;
          cleanup();
          reject(new Error("VEXYL-TTS WebSocket connection failed"));
        }
      };

      ws.onclose = () => {
        if (!isSettled) {
          isSettled = true;
          cleanup();
          reject(new Error("VEXYL-TTS WebSocket closed before audio was received"));
        }
      };
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
}
