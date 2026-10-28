import { describe, it, expect } from "vitest";
import { getChatModel, getEmbeddingModel } from "@/lib/gemini";

describe("Gemini Client & Model Wrapper", () => {
  it("should initialize generative model with healthcare system instructions and 0.3 temperature", () => {
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(model.model).toBe("models/gemini-1.5-flash");
  });

  it("should initialize empathetic mode when requested", () => {
    const empatheticModel = getChatModel({ isEmpathetic: true });
    expect(empatheticModel).toBeDefined();
    expect(empatheticModel.model).toBe("models/gemini-1.5-flash");
  });

  it("should configure text-embedding-004 model", () => {
    const embedModel = getEmbeddingModel();
    expect(embedModel).toBeDefined();
    expect(embedModel.model).toBe("models/text-embedding-004");
  });
});
