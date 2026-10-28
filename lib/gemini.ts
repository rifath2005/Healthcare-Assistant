import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerativeModel,
} from "@google/generative-ai";
import { env } from "@/lib/env";
import { recordGeminiUsage } from "@/lib/telemetry";

const BASE_HEALTHCARE_SYSTEM_INSTRUCTION = `
You are the Smart Healthcare Assistant, an empathetic, evidence-based wellness and health companion.
Your primary role is to provide accurate, non-diagnostic health information, explain medical concepts in accessible terms, offer emotional support, and guide users toward professional medical care when appropriate.

CORE GUIDELINES:
1. Grounding & Evidence: Ground your answers in vetted medical literature. When medical reference context is provided, cite references using numbered brackets like [1], [2].
2. Non-Diagnostic Boundary: You are an informational tool, NOT a certified diagnostic physician. Never formulate definitive diagnoses, prescribe pharmaceutical medications, or adjust dosages.
3. Clarity & Triage: Recommend consulting a qualified healthcare provider for personal diagnoses and treatment.
4. Tone: Calm, professional, supportive, objective, and culturally sensitive.
`;

const EMPATHETIC_COUNSELING_ADDENDUM = `
EMPATHY & MENTAL WELLNESS ADJUSTMENT ACTIVE:
The user is experiencing elevated stress, anxiety, or emotional distress.
- Employ compassionate active listening and non-judgmental emotional validation.
- Acknowledge their feelings before presenting analytical explanations.
- Recommend gentle, evidence-based coping exercises, such as the 4-7-8 breathing circle or the 5-4-3-2-1 sensory grounding technique.
- Maintain a warm, stabilizing, and reassuring presence without dismissing their physical or mental discomfort.
`;

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

let genAIInstance: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAIInstance) {
    const apiKey = env.GEMINI_API_KEY || "dummy_gemini_key";
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

export interface ModelOptions {
  isEmpathetic?: boolean;
  temperature?: number;
  systemInstructionAddendum?: string;
}

/**
 * Returns a configured Gemini 1.5 Flash generative model.
 */
export function getChatModel(options: ModelOptions = {}): GenerativeModel {
  const client = getGeminiClient();
  const temperature = options.temperature ?? 0.3; // Low temperature for medical grounding

  let systemInstruction = BASE_HEALTHCARE_SYSTEM_INSTRUCTION;
  if (options.isEmpathetic) {
    systemInstruction += "\n" + EMPATHETIC_COUNSELING_ADDENDUM;
  }
  if (options.systemInstructionAddendum) {
    systemInstruction += "\n" + options.systemInstructionAddendum;
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  return client.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    safetySettings: SAFETY_SETTINGS,
  });
}

/**
 * Returns the Gemini text embedding model (gemini-embedding-001 / text-embedding-004, 768 dimensions).
 */
export function getEmbeddingModel(): GenerativeModel {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  return client.getGenerativeModel({
    model: modelName,
  });
}

/**
 * Computes a 768-dimensional float embedding for a text query or document.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    recordGeminiUsage(100);
    const model = getEmbeddingModel();
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    } as any);
    return result.embedding.values;
  } catch (err) {
    console.error("Gemini embedding generation error:", err);
    // Return empty 768-dim vector fallback
    return new Array(768).fill(0);
  }
}
