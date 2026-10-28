export interface CrisisEvaluation {
  isCrisis: boolean;
  severity: "none" | "moderate" | "severe" | "emergency";
  triggerMatched?: string;
  recommendedAction?: string;
}

// Deterministic high-priority regex patterns for self-harm, suicide, and clinical emergencies
const SELF_HARM_PATTERNS: Array<{ pattern: RegExp; severity: "severe" | "emergency" }> = [
  { pattern: /\b(kill(ing)?\s+myself|commit(ting)?\s+suicide|end(ing)?\s+my\s+life)\b/i, severity: "emergency" },
  { pattern: /\b(want\s+to\s+die|wish\s+i\s+were\s+dead|don't\s+want\s+to\s+live|no\s+reason\s+to\s+live)\b/i, severity: "emergency" },
  { pattern: /\b(hang(ing)?\s+myself|slit(ting)?\s+my\s+wrists?|shoot(ing)?\s+myself|overdos(e|ing))\b/i, severity: "emergency" },
  { pattern: /\b(cutting\s+myself|self[-\s]?harm|hurt(ing)?\s+myself)\b/i, severity: "severe" },
  { pattern: /\b(suicidal\s+thoughts?|suicide\s+note|feel\s+like\s+ending\s+it\s+all|end\s+it\s+all)\b/i, severity: "emergency" },
  { pattern: /\b((took|take|swallow(ed)?)\s+(a\s+bottle\s+of\s+pills|all\s+my\s+pills)|bottle\s+of\s+pills)\b/i, severity: "emergency" },
  { pattern: /\b(jump(ing)?\s+off\s+a\s+bridge|jump(ing)?\s+in\s+front\s+of\s+a\s+train)\b/i, severity: "emergency" },
  { pattern: /\b(goodbye\s+cruel\s+world|planning\s+my\s+death)\b/i, severity: "emergency" },
];

const EMERGENCY_SYMPTOMS: Array<{ pattern: RegExp; severity: "emergency" }> = [
  { pattern: /\b(crushing\s+chest\s+pain|radiating\s+arm\s+pain|sudden\s+numbness\s+face|slurred\s+speech|severe\s+trouble\s+breathing)\b/i, severity: "emergency" },
  { pattern: /\b(coughing\s+up\s+large\s+amounts\s+of\s+blood|uncontrollable\s+bleeding|anaphylaxis|throat\s+closing)\b/i, severity: "emergency" },
];

/**
 * Deterministically evaluates text for immediate clinical crisis, self-harm, or suicidal ideation.
 * Bypasses LLM generation to guarantee zero latency and 100% adherence to safety protocols.
 */
export function evaluateCrisisSafety(text: string): CrisisEvaluation {
  if (!text || typeof text !== "string") {
    return { isCrisis: false, severity: "none" };
  }

  const clean = text.trim();

  // 1. Evaluate self-harm and suicidal triggers
  for (const { pattern, severity } of SELF_HARM_PATTERNS) {
    const match = clean.match(pattern);
    if (match) {
      return {
        isCrisis: true,
        severity,
        triggerMatched: match[0],
        recommendedAction: "CRISIS_HOTLINE_988",
      };
    }
  }

  // 2. Evaluate physical acute clinical emergencies
  for (const { pattern, severity } of EMERGENCY_SYMPTOMS) {
    const match = clean.match(pattern);
    if (match) {
      return {
        isCrisis: true,
        severity,
        triggerMatched: match[0],
        recommendedAction: "EMERGENCY_SERVICES_911",
      };
    }
  }

  return { isCrisis: false, severity: "none" };
}

/**
 * Crisis helpline resources payload.
 */
export const CRISIS_RESOURCES = {
  title: "Immediate Help & Crisis Support",
  message:
    "If you or someone you know is struggling or in distress, please know that you are not alone. Professional help is available 24/7.",
  contacts: [
    {
      name: "988 Suicide & Crisis Lifeline",
      detail: "Call or text 988 (Available 24/7 across the US and Canada)",
      actionUrl: "tel:988",
      actionLabel: "Call 988",
      type: "phone",
    },
    {
      name: "Crisis Text Line",
      detail: "Text HOME to 741741 to connect with a crisis counselor",
      actionUrl: "sms:741741?body=HOME",
      actionLabel: "Text 741741",
      type: "sms",
    },
    {
      name: "Emergency Medical Services",
      detail: "If you are experiencing a life-threatening medical emergency, call 911 immediately.",
      actionUrl: "tel:911",
      actionLabel: "Call 911 / 112",
      type: "emergency",
    },
  ],
};
