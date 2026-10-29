import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

// Spy on Gemini chat model invocation to verify history normalization
let lastPassedHistory: any = null;

vi.mock("@/lib/gemini", () => ({
  getChatModel: () => ({
    startChat: (options: { history: any[] }) => {
      lastPassedHistory = options.history;
      return {
        sendMessageStream: async () => ({
          stream: (async function* () {
            yield { text: () => "Here is follow-up health guidance." };
          })(),
        }),
      };
    },
    generateContentStream: async () => ({
      stream: (async function* () {
        yield { text: () => "Fallback response." };
      })(),
    }),
  }),
  getGeminiClient: () => ({}),
  generateEmbedding: async () => new Array(768).fill(0.05),
  FALLBACK_MODELS: ["gemini-3.1-flash-lite"],
}));

describe("Multi-Turn Chat Context & Alternating Turn Normalization", () => {
  it("should maintain multi-turn history across consecutive turns and strictly alternate user and model", async () => {
    lastPassedHistory = null;

    const multiTurnMessages = [
      { role: "user", content: "I have had a mild headache for two days." },
      { role: "assistant", content: "Acknowledge symptom. How would you describe the pain—sharp, dull, or throbbing?" },
      { role: "user", content: "It is a dull ache across my forehead." },
    ];

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: multiTurnMessages,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify history passed to Gemini startChat
    expect(lastPassedHistory).toBeDefined();
    expect(Array.isArray(lastPassedHistory)).toBe(true);

    // History should contain the previous 2 messages (excluding the latest user message which is sent in sendMessageStream)
    expect(lastPassedHistory.length).toBe(2);

    // First message in history must be 'user'
    expect(lastPassedHistory[0].role).toBe("user");
    expect(lastPassedHistory[0].parts[0].text).toContain("mild headache");

    // Second message must alternate to 'model'
    expect(lastPassedHistory[1].role).toBe("model");
    expect(lastPassedHistory[1].parts[0].text).toContain("How would you describe the pain");
  });

  it("should merge consecutive turns of the same role and normalize history starting with assistant", async () => {
    lastPassedHistory = null;

    const irregularHistory = [
      { role: "assistant", content: "Welcome to clinic." }, // Leading assistant turn to strip
      { role: "user", content: "I feel dizzy." },
      { role: "user", content: "And nauseous too." }, // Consecutive user turn to merge
      { role: "assistant", content: "When did the dizziness begin?" },
      { role: "user", content: "This morning after waking up." },
    ];

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: irregularHistory,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(lastPassedHistory).toBeDefined();
    // Leading assistant removed, user messages merged
    expect(lastPassedHistory[0].role).toBe("user");
    expect(lastPassedHistory[0].parts[0].text).toContain("I feel dizzy.");
    expect(lastPassedHistory[0].parts[0].text).toContain("And nauseous too.");

    expect(lastPassedHistory[1].role).toBe("model");
    expect(lastPassedHistory[1].parts[0].text).toContain("When did the dizziness begin?");
  });
});
