import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildVexylDescription,
  checkVexylHealth,
  clearVexylHealthCache,
  synthesizeWithVexylWs,
  getVexylWsUrl,
  getVexylHttpUrl,
  VEXYL_SPEAKERS,
  VEXYL_HEALTHCARE_TONES,
} from "@/lib/vexylTtsClient";
import { VoiceTtsManager } from "@/lib/voiceTts";

describe("VEXYL-TTS Neural Engine Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearVexylHealthCache();

    if (typeof URL.createObjectURL === "undefined") {
      URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-audio-url");
    } else {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-audio-url");
    }

    if (typeof URL.revokeObjectURL === "undefined") {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Description & Tone Prompt Engineering", () => {
    it("generates warm empathetic bedside description for en-IN by default", () => {
      const desc = buildVexylDescription("en-IN", undefined, "warm");
      expect(desc).toContain("Mary speaks in a warm and empathetic tone");
      expect(desc).toContain("reassuring bedside presence");
      expect(desc).toContain("recording is of very high quality with no background noise");
    });

    it("generates formal physician tone for hi-IN", () => {
      const desc = buildVexylDescription("hi-IN", undefined, "formal");
      expect(desc).toContain("Rohit speaks in a formal, neutral clinical tone");
      expect(desc).toContain("precise medical diction");
    });

    it("supports custom designated speaker names", () => {
      const desc = buildVexylDescription("ml-IN", "Anjali", "warm");
      expect(desc).toContain("Anjali speaks in a warm and empathetic tone");
    });

    it("falls back to en-IN Mary for unknown language codes", () => {
      const desc = buildVexylDescription("unknown-lang" as any, undefined, "default");
      expect(desc).toContain("Mary speaks in a calm, clear, and professional tone");
    });

    it("includes predefined speaker mappings for Indian regional languages", () => {
      expect(VEXYL_SPEAKERS["hi-IN"]).toBeDefined();
      expect(VEXYL_SPEAKERS["ta-IN"]).toBeDefined();
      expect(VEXYL_SPEAKERS["te-IN"]).toBeDefined();
      expect(VEXYL_SPEAKERS["ml-IN"]).toBeDefined();
      expect(VEXYL_SPEAKERS["kn-IN"]).toBeDefined();
      expect(VEXYL_HEALTHCARE_TONES["warm"]).toBeDefined();
    });
  });

  describe("URL Discovery & Configuration", () => {
    it("returns default local WebSocket and HTTP URLs when no override is set", () => {
      expect(getVexylWsUrl()).toBe("ws://127.0.0.1:8092");
      expect(getVexylHttpUrl()).toBe("http://127.0.0.1:8092");
    });

    it("respects window.__VEXYL_TTS_WS_URL__ if provided", () => {
      (window as any).__VEXYL_TTS_WS_URL__ = "ws://custom-tts.internal:8092";
      expect(getVexylWsUrl()).toBe("ws://custom-tts.internal:8092");
      delete (window as any).__VEXYL_TTS_WS_URL__;
    });
  });

  describe("Health Check Detection", () => {
    it("returns true when VEXYL-TTS /health returns status: ok", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", model: "ai4bharat/indic-parler-tts" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const isHealthy = await checkVexylHealth(1000);
      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8092/health",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("returns false gracefully when VEXYL-TTS /health endpoint fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });
      vi.stubGlobal("fetch", mockFetch);

      const isHealthy = await checkVexylHealth(1000);
      expect(isHealthy).toBe(false);
    });

    it("returns false gracefully on network failure or offline server", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      vi.stubGlobal("fetch", mockFetch);

      const isHealthy = await checkVexylHealth(500);
      expect(isHealthy).toBe(false);
    });
  });

  describe("WebSocket Synthesis Protocol", () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      url: string;
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: ((err: any) => void) | null = null;
      onclose: (() => void) | null = null;
      sentMessages: string[] = [];

      constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
        // Simulate connection ready after microtask
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify({ type: "ready" }) });
          }
        }, 5);
      }

      send(data: string) {
        this.sentMessages.push(data);
      }

      close() {
        if (this.onclose) this.onclose();
      }
    }

    beforeEach(() => {
      MockWebSocket.instances = [];
      vi.stubGlobal("WebSocket", MockWebSocket);
    });

    it("connects, sends synthesize payload with healthcare tone, and resolves audio blob", async () => {
      const synthPromise = synthesizeWithVexylWs("Your appointment is confirmed for Tuesday.", {
        lang: "en-IN",
        style: "warm",
      });

      // Wait for WS instance to receive the request
      await new Promise((r) => setTimeout(r, 20));

      const wsInstance = MockWebSocket.instances[0];
      expect(wsInstance).toBeDefined();
      expect(wsInstance.sentMessages.length).toBe(1);

      const payload = JSON.parse(wsInstance.sentMessages[0]);
      expect(payload.type).toBe("synthesize");
      expect(payload.text).toBe("Your appointment is confirmed for Tuesday.");
      expect(payload.lang).toBe("en-IN");
      expect(payload.style).toBe("warm");
      expect(payload.description).toContain("warm and empathetic tone");

      // Simulate server returning audio response
      // "UklGRg==" is base64 for 'RIFF' header prefix of WAV
      const mockWavBase64 = "UklGRiQAAABXQVZFRm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      wsInstance.onmessage?.({
        data: JSON.stringify({
          type: "audio",
          audio_b64: mockWavBase64,
          sample_rate: 22050,
          request_id: payload.request_id,
        }),
      });

      const result = await synthPromise;
      expect(result.audioUrl).toBe("blob:mock-audio-url");
      expect(result.sampleRate).toBe(22050);
      expect(result.audioBlob).toBeDefined();
    });

    it("rejects gracefully when server responds with error type", async () => {
      const synthPromise = synthesizeWithVexylWs("Test text");

      await new Promise((r) => setTimeout(r, 20));
      const wsInstance = MockWebSocket.instances[0];

      wsInstance.onmessage?.({
        data: JSON.stringify({
          type: "error",
          message: "GPU memory full",
        }),
      });

      await expect(synthPromise).rejects.toThrow("GPU memory full");
    });
  });

  describe("Dual-Engine Fallback in VoiceTtsManager", () => {
    it("falls back to Web Speech API when VEXYL-TTS is offline", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const providerChanges: string[] = [];
      const manager = new VoiceTtsManager({
        ttsProvider: "auto",
        onProviderChange: (p) => providerChanges.push(p),
      });

      const isHealthy = await manager.detectVexylAvailability();
      expect(isHealthy).toBe(false);
      expect(manager.getActiveProvider()).toBe("web-speech");
      expect(providerChanges).toContain("web-speech");
    });
  });
});

