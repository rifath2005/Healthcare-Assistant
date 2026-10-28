import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { extractLocalEntities, type ExtractedEntities } from "@/lib/nlpFallback";
import { checkRateLimit } from "@/lib/ratelimit";
import { recordGeminiUsage } from "@/lib/telemetry";

export const runtime = "nodejs";

const EXTRACTION_PROMPT = `
You are a clinical NLP extractor. Analyze the user's healthcare input and return ONLY a valid JSON object strictly conforming to this schema without markdown fences:
{
  "intent": "symptom_inquiry" | "appointment_booking" | "mental_health_support" | "general_faq",
  "symptoms": [
    {
      "name": "string (standardized symptom name)",
      "duration": "string (e.g. '2 days', 'since yesterday', 'unspecified')",
      "severity": "mild" | "moderate" | "severe"
    }
  ],
  "sentiment": "positive" | "neutral" | "negative",
  "mood": "anxious" | "depressed" | "stressed" | "overwhelmed" | "calm" | "neutral",
  "intensity": 1 to 5 (integer, where 5 is maximum distress),
  "urgency": "low" | "medium" | "emergency"
}
`;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = await checkRateLimit(`extract_${ip}`, 30, 60000);
    if (!rateCheck.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { text } = body || {};
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'text' field" }, { status: 400 });
    }

    // Try Gemini JSON extraction
    try {
      recordGeminiUsage(150);
      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const response = await model.generateContent([
        { text: EXTRACTION_PROMPT },
        { text: `User message: "${text}"` },
      ]);

      const jsonText = response.response.text();
      const parsed: ExtractedEntities = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    } catch (geminiError) {
      console.warn("Gemini entity extraction failed, using deterministic local fallback:", geminiError);
      // Fallback to local regex/heuristic entity extractor
      const fallbackEntities = extractLocalEntities(text);
      return NextResponse.json(fallbackEntities);
    }
  } catch (error) {
    console.error("Extraction route handler error:", error);
    return NextResponse.json({ error: "Internal extraction error" }, { status: 500 });
  }
}
