/**
 * Input sanitization and prompt injection defense utilities.
 */

const KNOWN_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+prompts?/i,
  /you\s+are\s+now\s+in\s+(developer|dan|god|unrestricted)\s+mode/i,
  /reveal\s+(your\s+)?(system\s+prompt|initial\s+instructions)/i,
  /what\s+are\s+your\s+(exact\s+)?instructions\s+above/i,
  /override\s+system\s+rules/i,
  /print\s+the\s+system\s+message/i,
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
 * Wraps user message with defensive grounding instructions.
 */
export function formatDefensivePrompt(userInput: string, retrievedContext?: string): string {
  const safeInput = sanitizeUserPrompt(userInput);

  let formatted = `<user_inquiry>\n${safeInput}\n</user_inquiry>`;

  if (retrievedContext && retrievedContext.trim().length > 0) {
    formatted = `<medical_knowledge_context>\n${retrievedContext}\n</medical_knowledge_context>\n\n${formatted}`;
  }

  return formatted;
}
