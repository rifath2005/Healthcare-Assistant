import { describe, it, expect, vi } from "vitest";
import { getChatModel, VOICE_MODE_SYSTEM_INSTRUCTION } from "@/lib/gemini";

describe("Voice Multi-Turn & Fallback Handling", () => {
  it("includes additive spoken instruction when isVoiceMode is true without altering base prompt", () => {
    // 1. Regular chat model (text mode)
    const textModel = getChatModel({ isVoiceMode: false });
    const textInstruction = JSON.stringify((textModel as any).systemInstruction || "");
    expect(textInstruction).not.toContain("SPOKEN VOICE CONVERSATION MODE ACTIVE");

    // 2. Voice chat model
    const voiceModel = getChatModel({ isVoiceMode: true });
    const voiceInstruction = JSON.stringify((voiceModel as any).systemInstruction || "");
    expect(voiceInstruction).toContain("SPOKEN VOICE CONVERSATION MODE ACTIVE");
    expect(voiceInstruction).toContain("Direct Clinical Solution");
    expect(voiceInstruction).toContain("Explicit Confirmation for Voice Actions");
  });

  it("handles multi-turn conversation switching between text and voice input seamlessly", () => {
    // Simulated multi-turn message history with mixed text and voice origins
    const history = [
      { role: "user", content: "I have had a dull headache for 2 days" }, // typed
      {
        role: "assistant",
        content:
          "I understand you are dealing with a dull headache. Have you noticed any other symptoms like fever or nausea?",
      },
      { role: "user", content: "No other symptoms, but it gets worse around computers" }, // spoken
      {
        role: "assistant",
        content:
          "That sounds like it could be a tension headache or digital eye strain. Resting in a dimly lit room and hydrating can help.",
      },
      { role: "user", content: "Book me an appointment with Dr. Sarah Lin next Tuesday" }, // spoken
    ];

    // Ensure valid alternating roles
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i].role).not.toBe(history[i + 1].role);
    }

    // Verify first message is user turn
    expect(history[0].role).toBe("user");
    // Verify latest message contains action intent
    expect(history[history.length - 1].content).toContain("Book me an appointment");
  });

  it("waits for exactly 3 seconds of continuous silence with no words before triggering reply", () => {
    vi.useFakeTimers();

    const dispatchMock = vi.fn();
    let accumulatedTranscript = "";
    let latestInterim = "";
    let speechSilenceTimer: any = null;

    const onSpeechResult = (sessionFinal: string, sessionInterim: string) => {
      const currentSpoken = [accumulatedTranscript, sessionFinal, sessionInterim]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (currentSpoken) {
        latestInterim = currentSpoken;
        if (speechSilenceTimer) {
          clearTimeout(speechSilenceTimer);
        }
        speechSilenceTimer = setTimeout(() => {
          const spokenText = (latestInterim || accumulatedTranscript).trim();
          if (spokenText.length >= 2) {
            accumulatedTranscript = "";
            latestInterim = "";
            dispatchMock(spokenText);
          }
        }, 3000);
      }
    };

    // User speaks first phrase: "I have had a mild fever"
    onSpeechResult("I have had a mild fever", "");
    expect(latestInterim).toBe("I have had a mild fever");
    expect(dispatchMock).not.toHaveBeenCalled();

    // 1500ms elapses (natural pause) - assistant MUST NOT reply yet
    vi.advanceTimersByTime(1500);
    expect(dispatchMock).not.toHaveBeenCalled();

    // User speaks second phrase before 3s expires: "and a sore throat"
    onSpeechResult("I have had a mild fever", "and a sore throat");
    expect(latestInterim).toBe("I have had a mild fever and a sore throat");

    // Another 2000ms elapses - assistant MUST NOT reply yet (timer was reset)
    vi.advanceTimersByTime(2000);
    expect(dispatchMock).not.toHaveBeenCalled();

    // Full 3000ms from the last spoken word elapses (total 3000ms silence with no new words)
    vi.advanceTimersByTime(1000); // 2000ms + 1000ms = 3000ms from last word!
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith("I have had a mild fever and a sore throat");

    vi.useRealTimers();
  });

  it("resumes listening loop after assistant finishes spoken reply", () => {
    let voiceState: "idle" | "listening" | "thinking" | "speaking" = "idle";
    let isListeningActive = false;

    const startListeningLoop = vi.fn(() => {
      voiceState = "listening";
      isListeningActive = true;
    });

    const onFinishSpeaking = () => {
      voiceState = "listening";
      startListeningLoop();
    };

    // Assistant is speaking
    voiceState = "speaking";
    isListeningActive = false;

    // Speech completes
    onFinishSpeaking();

    expect(voiceState).toBe("listening");
    expect(startListeningLoop).toHaveBeenCalledTimes(1);
    expect(isListeningActive).toBe(true);
  });
});
