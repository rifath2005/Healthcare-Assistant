/**
 * Input sanitization and prompt injection defense utilities.
 */

const KNOWN_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?((previous|prior)\s+)?(system\s+)?prompts?/i,
  /you\s+are\s+now\s+in\s+(developer|dan|god|unrestricted)\s+mode/i,
  /reveal\s+(your\s+)?(system\s+prompt|initial\s+instructions)/i,
  /what\s+are\s+your\s+(exact\s+)?instructions\s+above/i,
  /override\s+system\s+rules/i,
  /print\s+(your\s+|the\s+)?(system\s+message|system\s+prompt|instructions)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|jailbroken|unfiltered|developer)\b/i,
  /bypass\s+(your\s+)?(safety|system|content)\s+(filters?|rules?|guardrails?)/i,
  /simulate\s+(a\s+)?(jailbreak|terminal|shell|cmd)\b/i,
  /repeat\s+everything\s+(above|prior)/i,
];

/**
 * Strips dangerous HTML and script tags from text.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

/**
 * Checks whether user input matches known prompt injection or jailbreak patterns.
 */
export function detectPromptInjection(text: string): { isInjection: boolean; pattern?: string } {
  if (!text) return { isInjection: false };

  for (const pattern of KNOWN_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { isInjection: true, pattern: pattern.source };
    }
  }

  return { isInjection: false };
}

/**
 * Sanitizes and securely encapsulates user content inside strict boundary tags
 * to prevent prompt delimiter breakout and instruction leakage.
 */
export function sanitizeUserPrompt(rawInput: string): string {
  if (!rawInput) return "";

  // 1. Strip raw HTML scripts
  let sanitized = sanitizeHtml(rawInput);

  // 2. Escape XML-like delimiter markers that attackers might use
  sanitized = sanitized
    .replace(/<\/?system>/gi, "[system]")
    .replace(/<\/?context>/gi, "[context]")
    .replace(/<\/?user_input>/gi, "[user_input]");

  // 3. Limit single message length to 4000 characters to prevent buffer exhaustion
  if (sanitized.length > 4000) {
    sanitized = sanitized.slice(0, 4000);
  }

  return sanitized.trim();
}

/**
 * Wraps user message with defensive grounding instructions and strict domain enforcement.
 */
export function formatDefensivePrompt(userInput: string, retrievedContext?: string): string {
  const safeInput = sanitizeUserPrompt(userInput);

  let formatted = `<system_domain_directive>
You are strictly limited to the healthcare, medicine, health literacy, mental wellness, and clinic doctor scheduling domain.
If the inquiry inside <user_inquiry> asks for software code, computer programming, algorithms (such as two-pointer, leetcode, sorting, or web development), mathematics, non-medical essays, or general trivia, you must strictly refuse to answer and redirect the patient to healthcare topics.
</system_domain_directive>

<user_inquiry>
${safeInput}
</user_inquiry>`;

  if (retrievedContext && retrievedContext.trim().length > 0) {
    formatted = `<medical_knowledge_context>\n${retrievedContext}\n</medical_knowledge_context>\n\n${formatted}`;
  }

  return formatted;
}
