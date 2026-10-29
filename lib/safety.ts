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

export interface DomainScopeResult {
  isAllowed: boolean;
  category: "healthcare" | "out_of_scope";
  matchedPattern?: string;
  reason?: string;
  refusalMessage?: string;
}

export const OUT_OF_SCOPE_REFUSAL =
  "I am your dedicated Smart Healthcare Assistant, specialized exclusively in medical inquiries, health symptoms, clinical literacy, and scheduling appointments with our clinic physicians.\n\nI cannot assist with programming, software engineering, algorithms, or non-medical topics. Please describe any physical symptoms or wellness questions you have, or let me know if you would like to schedule a consultation with Dr. Elena Rostova, Dr. Marcus Vance, or Dr. Sarah Lin.";

export const INJECTION_REFUSAL =
  "For patient data security and clinical compliance, system security overrides and prompt modifications are strictly prohibited. How may I assist with your health or symptoms today?";

const OUT_OF_SCOPE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // 1. Algorithms, Data Structures & Coding Challenges
  {
    pattern: /\b(two\s+pointer|sliding\s+window|binary\s+search|linked\s+list|dynamic\s+programming|dijkstra|bubble\s+sort|quick\s+sort|merge\s+sort|tree\s+traversal|bfs|dfs|leetcode|hackerrank|codeforces|time\s+complexity|space\s+complexity|big\s*o\s+notation)\b/i,
    label: "algorithms_and_data_structures",
  },
  // 2. Code generation & software development requests
  {
    pattern: /\b(write|create|generate|implement|debug|solve|fix|give\s+me|show\s+me)\s+(a\s+)?(python|javascript|typescript|c\+\+|java|golang|rust|php|sql|bash|c#|html|css|ruby|swift|kotlin)?\s*(code|script|program|function|algorithm|class|method|regex|query|endpoint|component)\b/i,
    label: "code_generation",
  },
  {
    pattern: /\b(program\s+for|code\s+for|syntax\s+for|script\s+for|solution\s+for)\s+(two\s+pointer|reverse|fibonacci|palindrome|prime\s+number|factorial|matrix|knapsack|calculator|game)\b/i,
    label: "coding_challenge_solution",
  },
  {
    pattern: /\b(sql\s+query|database\s+query|select\s+.*\s+from|insert\s+into|drop\s+table|react|next\.?js|angular|vue|node\.?js|django|flask|spring\s+boot|docker|kubernetes|mongodb|postgresql|mysql|sqlite|redis|graphql|rest\s+api|git\s+commit|git\s+push|npm\s+install|pip\s+install)\b/i,
    label: "software_infrastructure",
  },
  {
    pattern: /(def\s+\w+\s*\(|function\s+\w+\s*\(|public\s+class\s+\w+|const\s+\w+\s*=\s*\(|import\s+react|#include\s*<|console\.log\(|System\.out\.print)/i,
    label: "code_syntax",
  },

  // 3. Academic Mathematics, Calculus & Logic Puzzles
  {
    pattern: /\b(differentiate|integrate|derivative\s+of|integral\s+of)\b/i,
    label: "calculus",
  },
  {
    pattern: /\b(solve|calculate|factor)\s+(the\s+)?(derivative|integral|limit|matrix|eigenvalue|differential\s+equation|polynomial|quadratic\s+equation|calculus|algebra|equation)\b/i,
    label: "mathematics_solver",
  },
  {
    pattern: /\b(pythagorean\s+theorem|quadratic\s+formula|fourier\s+transform|laplace\s+transform|taylor\s+series)\b/i,
    label: "math_theorems",
  },

  // 4. General Trivia, Sports, Non-Medical Tasks
  {
    pattern: /\b(who\s+won|match\s+score|super\s+bowl|world\s+cup|ipl\s+match|nba\s+finals|premier\s+league|champions\s+league|fifa|olympics\s+score)\b/i,
    label: "sports_scores",
  },
  {
    pattern: /\bwrite\s+(a\s+)?(poem|story|essay|song|lyrics|rap|novel)\b/i,
    label: "creative_writing_non_health",
  },
  {
    pattern: /\b(crypto|bitcoin|ethereum|dogecoin|stock\s+market|buy\s+shares|forex\s+trading|invest\s+in\s+stocks|trading\s+strategy)\b/i,
    label: "financial_trading",
  },
  {
    pattern: /\b(who\s+is\s+the\s+president|election\s+results|vote\s+for|political\s+candidate|republican|democrat|parliament\s+election)\b/i,
    label: "politics",
  },
];

// Physical or clinical health indicators that override technical terms (e.g. "wrist pain from typing", "eye strain from computer")
const HEALTH_CONTEXT_OVERRIDES = [
  /\b(pain|ache|hurts?|sore|strain|fatigue|headache|migraine|dizzy|nausea|fever|cough|sick|illness|syndrome|carpal\s+tunnel|ergonomic|posture|health|doctor|appointment|consult|hospital|symptom|injury|sprain|swelling|cramp|insomnia|stress|anxiety|depression|therapy)\b/i,
];

/**
 * Deterministically checks if a user query belongs within the healthcare/medical domain.
 * Blocks non-medical queries (such as programming, math, sports, and trivia) before LLM invocation.
 */
export function evaluateDomainScope(text: string): DomainScopeResult {
  if (!text || typeof text !== "string") {
    return { isAllowed: true, category: "healthcare" };
  }

  const clean = text.trim();

  for (const { pattern, label } of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(clean)) {
      // Check if this query is a genuine medical symptom or clinic consultation that happens to mention computers/work
      const hasHealthContext = HEALTH_CONTEXT_OVERRIDES.some((override) => override.test(clean));
      const isExplicitCodingRequest = /\b(write|create|generate|implement|code\s+for|program\s+for|syntax\s+for|solution\s+for|debug)\b/i.test(clean);

      // If it contains health symptoms and is NOT an explicit request to write code, allow it
      if (hasHealthContext && !isExplicitCodingRequest) {
        continue;
      }

      return {
        isAllowed: false,
        category: "out_of_scope",
        matchedPattern: label,
        reason: `Query matched non-medical pattern: ${label}`,
        refusalMessage: OUT_OF_SCOPE_REFUSAL,
      };
    }
  }

  return { isAllowed: true, category: "healthcare" };
}

