import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { MessageBubble } from "@/components/chat/MessageBubble";

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }),
}));

describe("Chat Interface & UI Component States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Initial & Empty State", () => {
    it("renders the initial welcome message with medical literacy disclaimer", () => {
      render(<ChatContainer />);

      expect(
        screen.getByText(/Hello! I am your Smart Healthcare Assistant/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/I provide evidence-grounded health literacy and guidance/i)
      ).toBeInTheDocument();
    });

    it("ensures top of chat disclaimer banner is removed for clean UI", () => {
      render(<ChatContainer />);

      const disclaimer = screen.queryByRole("note", { name: /medical disclaimer/i });
      expect(disclaimer).not.toBeInTheDocument();
    });

    it("renders suggested starter questions as interactive chips", () => {
      render(<ChatContainer />);

      expect(screen.getByText("Suggested:")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /I have had a dull headache for 2 days/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /What are the warning signs of a heart attack\?/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /How do I schedule an appointment with a clinic doctor\?/i })
      ).toBeInTheDocument();
    });
  });

  describe("MessageBubble with Timestamps and Typing Animation", () => {
    it("renders user bubble with timestamp aligned correctly", () => {
      const fixedTimestamp = "2026-10-29T10:30:00.000Z";
      render(
        <MessageBubble
          role="user"
          content="I need symptom advice"
          createdAt={fixedTimestamp}
        />
      );

      expect(screen.getByText("I need symptom advice")).toBeInTheDocument();
      // Timestamp formatted time exists in bubble
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}\s*(AM|PM)?/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("renders assistant typing indicator when pending response", () => {
      render(
        <MessageBubble
          role="assistant"
          content=""
          isTyping={true}
        />
      );

      const status = screen.getByRole("status", { name: /Assistant is formulating response/i });
      expect(status).toBeInTheDocument();
      expect(screen.getByText(/Consulting medical guidelines\.\.\./i)).toBeInTheDocument();
    });

    it("renders appointment booking prompt card when content suggests booking", () => {
      const handleBooking = vi.fn();
      render(
        <MessageBubble
          role="assistant"
          content="You may want to schedule an appointment with Dr. Elena Rostova."
          onOpenBookingModal={handleBooking}
        />
      );

      expect(screen.getByText(/Ready to consult a physician\?/i)).toBeInTheDocument();
      const virtualBtn = screen.getByRole("button", { name: /Book Virtual/i });
      fireEvent.click(virtualBtn);
      expect(handleBooking).toHaveBeenCalledWith("virtual");
    });
  });

  describe("Clear Chat Control", () => {
    it("clears chat history and restores the initial welcome state when Clear Chat is clicked", async () => {
      render(<ChatContainer />);

      // Verify Clear Chat button exists
      const clearBtn = screen.getByRole("button", { name: /Clear chat/i });
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Hello! I am your Smart Healthcare Assistant/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error States Handling", () => {
    it("gracefully renders an assistant error bubble when POST /api/chat returns HTTP 500", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        if (url.toString().includes("/api/extract")) {
          return Promise.resolve(new Response(JSON.stringify({ mood: "neutral" })));
        }
        if (url.toString().includes("/api/chat")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ error: "Daily Google Gemini free-tier quota is currently exhausted." }),
              { status: 429, headers: { "Content-Type": "application/json" } }
            )
          );
        }
        return Promise.reject(new Error("Unknown route"));
      }) as any;

      render(<ChatContainer />);

      const input = screen.getByPlaceholderText(/Describe your symptoms/i);
      fireEvent.change(input, { target: { value: "Tell me about bronchitis" } });

      const sendBtn = screen.getByRole("button", { name: /Send message/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/I apologize, but I encountered an issue: Daily Google Gemini free-tier quota/i)
        ).toBeInTheDocument();
      });
    });

    it("handles dropped SSE network stream and displays helpful message", async () => {
      // Stream that abruptly errors during reading
      const mockStream = new ReadableStream({
        start(controller) {
          controller.error(new Error("Network connection lost"));
        },
      });

      global.fetch = vi.fn((url: string | URL | Request) => {
        if (url.toString().includes("/api/extract")) {
          return Promise.resolve(new Response(JSON.stringify({ mood: "neutral" })));
        }
        if (url.toString().includes("/api/chat")) {
          return Promise.resolve(
            new Response(mockStream, {
              status: 200,
              headers: { "Content-Type": "text/event-stream" },
            })
          );
        }
        return Promise.reject(new Error("Unknown route"));
      }) as any;

      render(<ChatContainer />);

      const input = screen.getByPlaceholderText(/Describe your symptoms/i);
      fireEvent.change(input, { target: { value: "Can I take acetaminophen for a headache?" } });

      const sendBtn = screen.getByRole("button", { name: /Send message/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/I'm sorry, the connection was interrupted before I could complete my response/i)
        ).toBeInTheDocument();
      });
    });

    it("renders the Voice Mode toggle button in the header bar", () => {
      render(<ChatContainer />);

      const voiceButtons = screen.getAllByRole("button", { name: /voice mode/i });
      expect(voiceButtons.length).toBeGreaterThan(0);
    });
  });
});
