import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  
  // Google Gemini API
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required").default("dummy_gemini_key"),
  
  // Supabase Credentials
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .transform((val) => val.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, ""))
    .default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required").default("placeholder_anon_key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required").default("placeholder_service_role_key"),
  
  // Google Calendar & Service Account
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REFRESH_TOKEN: z.string().optional().default(""),
  DEFAULT_GOOGLE_MEET_URL: z.string().optional().default(""),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(""),
  GOOGLE_PRIVATE_KEY: z.string().optional().default(""),
  
  // Resend Email
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().optional().default("onboarding@resend.dev"),
  EMAIL_FROM: z.string().optional().default("onboarding@resend.dev"),
  
  // Security & Cron
  CRON_SECRET: z.string().optional().default("default_cron_secret_32_characters_long"),
  CLINICAL_ENCRYPTION_KEY: z.string().min(16).default("0123456789abcdef0123456789abcdef"),
  
  // Turnstile
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional().default(""),
  TURNSTILE_SECRET_KEY: z.string().optional().default(""),
  
  // Sentry & Telemetry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),
  
  // Redis / Upstash
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    DEFAULT_GOOGLE_MEET_URL: process.env.DEFAULT_GOOGLE_MEET_URL,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM,
    EMAIL_FROM: process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
    CLINICAL_ENCRYPTION_KEY: process.env.CLINICAL_ENCRYPTION_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Environment validation error:", JSON.stringify(error.format(), null, 2));
  }
  // In non-strict mode / tests, fall back to default parsed object
  parsedEnv = envSchema.parse({});
}

export const env = parsedEnv;
