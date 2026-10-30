import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoiceTtsManager } from "@/lib/voiceTts";

describe("Voice TTS Manager with Sentence Chunking & Barge-In", () => {
  let speakMock: any;
  let cancelMock: any;

  beforeEach(() => {
    speakMock = vi.fn();
    cancelMock = vi.fn();

    class MockUtterance {
      text: string;
      rate = 1.0;
      pitch = 1.0;
      lang = "en-US";
      voice = null;
      onstart?: () => void;
      onend?: () => void;
      onerror?: (err: any) => void;
      constructor(text: string) {
        this.text = text;
      }
    }

    vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
    vi.stubGlobal("window", {
      speechSynthesis: {
        speak: speakMock,
        cancel: cancelMock,
      },
      SpeechSynthesisUtterance: MockUtterance,
    });
  });

  it("cleans markdown syntax, citations, and URLs for natural spoken speech", () => {
    const rawMarkdown =
      "Hello! Here is **important** information [1] from https://cdc.gov/headaches.\nRest and hydrate.";
    const cleaned = VoiceTtsManager.cleanTextForSpeech(rawMarkdown);

    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("[1]");
    expect(cleaned).not.toContain("https://");
    expect(cleaned).toContain("Hello! Here is important information from . Rest and hydrate.");
  });

  it("buffers incoming tokens and emits completed sentences incrementally", () => {
    const spokenSentences: string[] = [];
    const tts = new VoiceTtsManager({
      onSentenceSpoken: (s) => spokenSentences.push(s),
    });

    // Stream tokens one by one
    tts.feedStreamToken("Tension ");
    tts.feedStreamToken("headaches ");
    tts.feedStreamToken("are common. "); // First sentence ends here

    expect(speakMock).toHaveBeenCalledTimes(1);
    const firstUtterance = speakMock.mock.calls[0][0];
    expect(firstUtterance.text).toBe("Tension headaches are common.");

    // Continue streaming second sentence
    tts.feedStreamToken("Staying hydrated ");
    tts.feedStreamToken("can help! "); // Second sentence ends here

    // Simulate completion of first sentence in SpeechSynthesis
    firstUtterance.onend();

    expect(speakMock).toHaveBeenCalledTimes(2);
    const secondUtterance = speakMock.mock.calls[1][0];
    expect(secondUtterance.text).toBe("Staying hydrated can help!");
  });

  it("does not split prematurely on clinical abbreviations like Dr. or MD.", () => {
    const tts = new VoiceTtsManager();

    tts.feedStreamToken("You should consult Dr. ");
    // Should NOT trigger speak yet because "Dr." is a recognized abbreviation
    expect(speakMock).not.toHaveBeenCalled();

    tts.feedStreamToken("Sarah Lin for your migraines. ");
    // Now that the full sentence finished, speak is triggered
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][0].text).toContain("Dr. Sarah Lin for your migraines.");
  });

  it("flushes remaining buffer on stream DONE", () => {
    const tts = new VoiceTtsManager();

    tts.feedStreamToken("This is a final thought without punctuation");
    expect(speakMock).not.toHaveBeenCalled();

    tts.flushStreamBuffer();
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][0].text).toBe("This is a final thought without punctuation");
  });

  it("immediately cancels audio playback on barge-in / interrupt", () => {
    const tts = new VoiceTtsManager();

    tts.feedStreamToken("Sentence one is playing. ");
    tts.feedStreamToken("Sentence two is queued. ");

    expect(speakMock).toHaveBeenCalledTimes(1);

    // User interrupts
    tts.stop();

    expect(cancelMock).toHaveBeenCalled();
  });
});
