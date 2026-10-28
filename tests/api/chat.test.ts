import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

// Mock Gemini client to avoid external API dependencies during test execution
vi.mock("@/lib/gemini", () => ({
  getChatModel: () => ({
    startChat: () => ({
      sendMessageStream: async () => ({
        stream: (async function* () {
          yield { text: () => "Consultation " };
          yield { text: () => "guidance provided." };
        })(),
      }),
    }),
  }),
  getGeminiClient: () => ({}),
  generateEmbedding: async () => new Array(768).fill(0.1),
  FALLBACK_MODELS: ["gemini-3.1-flash-lite"],
}));

describe("POST /api/chat Streaming Route Handler", () => {
  it("should return HTTP 400 when request body is empty or malformed", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("messages");
  });

  it("should return HTTP 400 when latest message content is empty", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return Server-Sent Events (SSE) stream on valid message turn", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "How do I relieve a tension headache?" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.body).toBeDefined();
  });

  it("should stream CRISIS_TRIGGERED payload on self-harm detection", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "I want to kill myself right now" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Read stream content
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
      }
    }

    expect(accumulated).toContain("CRISIS_TRIGGERED");
    expect(accumulated).toContain("988 Suicide & Crisis Lifeline");
  });
});
