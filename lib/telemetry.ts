/**
 * Server-side telemetry and free-tier quota monitor.
 */

interface UsageCounters {
  geminiCalls: number;
  geminiEstimatedTokens: number;
  resendEmailsSent: number;
  vectorSearches: number;
  lastReset: string;
}

const FREE_TIER_LIMITS = {
  geminiRequestsPerMinute: 15,
  geminiRequestsPerDay: 1500,
  resendEmailsPerDay: 100,
  supabaseStorageMb: 500,
};

let globalUsage: UsageCounters = {
  geminiCalls: 0,
  geminiEstimatedTokens: 0,
  resendEmailsSent: 0,
  vectorSearches: 0,
  lastReset: new Date().toISOString(),
};

/**
 * Records an invocation of the Gemini generative or embedding API.
 */
export function recordGeminiUsage(estimatedTokens: number = 250) {
  globalUsage.geminiCalls += 1;
  globalUsage.geminiEstimatedTokens += estimatedTokens;

  if (globalUsage.geminiCalls >= FREE_TIER_LIMITS.geminiRequestsPerDay * 0.9) {
    console.warn(
      `⚠️ WARNING: Gemini API daily calls reached 90% of free tier (${globalUsage.geminiCalls}/${FREE_TIER_LIMITS.geminiRequestsPerDay})`
    );
  }
}

/**
 * Records an email dispatch through Resend.
 */
export function recordEmailDispatch() {
  globalUsage.resendEmailsSent += 1;

  if (globalUsage.resendEmailsSent >= FREE_TIER_LIMITS.resendEmailsPerDay * 0.9) {
    console.warn(
      `⚠️ WARNING: Resend daily emails reached 90% of free tier (${globalUsage.resendEmailsSent}/${FREE_TIER_LIMITS.resendEmailsPerDay})`
    );
  }
}

/**
 * Records a vector similarity query against Supabase pgvector.
 */
export function recordVectorQuery() {
  globalUsage.vectorSearches += 1;
}

/**
 * Returns current telemetry snapshot.
 */
export function getTelemetrySnapshot() {
  return {
    usage: { ...globalUsage },
    limits: FREE_TIER_LIMITS,
    health: {
      geminiRemainingEstimated: Math.max(0, FREE_TIER_LIMITS.geminiRequestsPerDay - globalUsage.geminiCalls),
      resendRemainingEstimated: Math.max(0, FREE_TIER_LIMITS.resendEmailsPerDay - globalUsage.resendEmailsSent),
    },
  };
}
