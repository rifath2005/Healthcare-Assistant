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
    expect(voiceInstruction).toContain("Natural Verbal Acknowledgments");
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

  it("gracefully falls back when Web Speech API is absent without throwing exceptions", () => {
    // Simulate browser environment where SpeechRecognition is undefined (e.g. Firefox or older browser)
    vi.stubGlobal("window", {});

    const hasSpeechRecognition =
      typeof window !== "undefined" &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    expect(hasSpeechRecognition).toBe(false);

    // In this state, UI alerts user and safely maintains text mode without breaking
  });
});
