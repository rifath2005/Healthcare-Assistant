import { describe, it, expect } from "vitest";
import { evaluateCrisisSafety } from "@/lib/safety";

describe("Clinical Safety & Crisis Gate Protocol", () => {
  it("should detect explicit self-harm and suicidal ideation with 100% reliability", () => {
    const crisisPrompts = [
      "I want to kill myself",
      "I am thinking of committing suicide tonight",
      "I just want to end my life",
      "I wish I were dead, there is no reason to live",
      "I am planning on cutting myself",
      "Thinking about jumping off a bridge",
      "I took a bottle of pills to end it all",
    ];

    for (const prompt of crisisPrompts) {
      const evaluation = evaluateCrisisSafety(prompt);
      expect(evaluation.isCrisis).toBe(true);
      expect(["severe", "emergency"]).toContain(evaluation.severity);
      expect(evaluation.recommendedAction).toBeDefined();
    }
  });

  it("should detect acute medical emergencies (chest pain, stroke signs)", () => {
    const emergencyPrompts = [
      "I have crushing chest pain and radiating arm pain",
      "My father has sudden numbness face and slurred speech",
      "I am having severe trouble breathing and throat closing",
    ];

    for (const prompt of emergencyPrompts) {
      const evaluation = evaluateCrisisSafety(prompt);
      expect(evaluation.isCrisis).toBe(true);
      expect(evaluation.severity).toBe("emergency");
    }
  });

  it("should NOT flag benign somatic or health wellness questions", () => {
    const benignPrompts = [
      "How do I manage a tension headache from studying?",
      "What are the benefits of 4-7-8 breathing?",
      "Can I take ibuprofen for a sore throat?",
      "How many hours of sleep do adults need per night?",
      "I have had a mild cough for two days",
    ];

    for (const prompt of benignPrompts) {
      const evaluation = evaluateCrisisSafety(prompt);
      expect(evaluation.isCrisis).toBe(false);
      expect(evaluation.severity).toBe("none");
    }
  });
});
