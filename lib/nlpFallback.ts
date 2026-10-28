export interface ExtractedEntities {
  intent: "symptom_inquiry" | "appointment_booking" | "mental_health_support" | "general_faq";
  symptoms: Array<{
    name: string;
    duration: string;
    severity: "mild" | "moderate" | "severe";
  }>;
  mood: "anxious" | "depressed" | "stressed" | "overwhelmed" | "calm" | "neutral";
  intensity: number;
  urgency: "low" | "medium" | "emergency";
}

const COMMON_SYMPTOMS: Array<{ name: string; regex: RegExp }> = [
  { name: "headache", regex: /\b(headaches?|migraines?|head\s+pains?)\b/i },
  { name: "fever", regex: /\b(fevers?|high\s+temperatures?|chills|sweats)\b/i },
  { name: "cough", regex: /\b(cough(ing|s)?|dry\s+cough|hacking\s+cough)\b/i },
  { name: "sore throat", regex: /\b(sore\s+throats?|throat\s+pain|pain\s+swallowing)\b/i },
  { name: "chest pain", regex: /\b(chest\s+pains?|chest\s+tightness|chest\s+pressure)\b/i },
  { name: "shortness of breath", regex: /\b(shortness\s+of\s+breath|difficulty\s+breathing|breathless(ness)?)\b/i },
  { name: "nausea", regex: /\b(nausea|vomiting|throwing\s+up|queasy)\b/i },
  { name: "dizziness", regex: /\b(dizzy|dizziness|lightheaded(ness)?|vertigo)\b/i },
  { name: "fatigue", regex: /\b(fatigue|exhaust(ed|ion)|tiredness|lack\s+of\s+energy)\b/i },
  { name: "stomach ache", regex: /\b(stomach\s+aches?|abdominal\s+pains?|belly\s+pains?|cramps?)\b/i },
  { name: "insomnia", regex: /\b(insomnia|cannot\s+sleep|sleeplessness|waking\s+up)\b/i },
  { name: "joint pain", regex: /\b(joint\s+pains?|arthritis|knee\s+pains?|back\s+pains?)\b/i },
  { name: "rash", regex: /\b(rash(es)?|hives|itchy\s+skin|eczema)\b/i },
];

const DURATION_REGEX = /\b(for\s+)?(\d+\s+(days?|weeks?|months?|hours?)|yesterday|since\s+this\s+morning|a\s+few\s+days|today)\b/i;

const SEVERITY_HIGH = /\b(severe|intense|unbearable|terrible|excruciating|very\s+bad)\b/i;
const SEVERITY_MILD = /\b(mild|slight|little|minor|manageable)\b/i;

const BOOKING_KEYWORDS = /\b(book|schedule|appointment|consultation|doctor|see\s+a\s+physician|reserve\s+a\s+slot)\b/i;
const MENTAL_HEALTH_KEYWORDS = /\b(anxiety|panic|depress(ed|ion)|stressed?|overwhelmed|hopeless|sad|grief|lonely)\b/i;

/**
 * Local deterministic NLP fallback extractor for zero-latency or offline/rate-limited operation.
 */
export function extractLocalEntities(text: string): ExtractedEntities {
  const lower = text.toLowerCase();

  // 1. Detect Intent
  let intent: ExtractedEntities["intent"] = "general_faq";
  if (BOOKING_KEYWORDS.test(lower)) {
    intent = "appointment_booking";
  } else if (MENTAL_HEALTH_KEYWORDS.test(lower)) {
    intent = "mental_health_support";
  } else if (COMMON_SYMPTOMS.some((s) => s.regex.test(lower))) {
    intent = "symptom_inquiry";
  }

  // 2. Extract Duration
  const durationMatch = text.match(DURATION_REGEX);
  const detectedDuration = durationMatch ? durationMatch[0] : "unspecified";

  // 3. Extract Severity
  let severity: "mild" | "moderate" | "severe" = "moderate";
  if (SEVERITY_HIGH.test(lower)) severity = "severe";
  else if (SEVERITY_MILD.test(lower)) severity = "mild";

  // 4. Extract Symptoms
  const symptoms: ExtractedEntities["symptoms"] = [];
  for (const symptom of COMMON_SYMPTOMS) {
    if (symptom.regex.test(lower)) {
      symptoms.push({
        name: symptom.name,
        duration: detectedDuration,
        severity,
      });
    }
  }

  // 5. Detect Mood & Intensity
  let mood: ExtractedEntities["mood"] = "neutral";
  let intensity = 2;

  if (/\b(panic|terrified|severely\s+anxious|overwhelmed)\b/i.test(lower)) {
    mood = "overwhelmed";
    intensity = 5;
  } else if (/\b(anxious|nervous|worry|worried)\b/i.test(lower)) {
    mood = "anxious";
    intensity = 3;
  } else if (/\b(depressed|hopeless|miserable|down)\b/i.test(lower)) {
    mood = "depressed";
    intensity = 4;
  } else if (/\b(stressed|pressure|tense)\b/i.test(lower)) {
    mood = "stressed";
    intensity = 3;
  } else if (/\b(calm|peaceful|fine|good|relaxed)\b/i.test(lower)) {
    mood = "calm";
    intensity = 1;
  }

  // 6. Urgency detection
  let urgency: ExtractedEntities["urgency"] = "low";
  if (/\b(chest\s+pain|shortness\s+of\s+breath|unconscious|slurred\s+speech|severe\s+bleeding)\b/i.test(lower)) {
    urgency = "emergency";
  } else if (severity === "severe" || symptoms.length >= 3) {
    urgency = "medium";
  }

  return {
    intent,
    symptoms,
    mood,
    intensity,
    urgency,
  };
}
