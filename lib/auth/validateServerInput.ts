import { z } from "zod";
import { NextResponse } from "next/server";
import { signupSchema, loginSchema } from "@/lib/validations/auth";
import { env } from "@/lib/env";

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  response: NextResponse;
  errors: Record<string, string>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates Turnstile captcha response token with Cloudflare's siteverify endpoint.
 */
export async function verifyTurnstileToken(token?: string, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY || !token) {
    // If not configured, pass verification in development/testing
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteIp) formData.append("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const outcome = await res.json();
    return outcome.success === true;
  } catch (error) {
    console.error("Cloudflare Turnstile verification error:", error);
    return false;
  }
}

/**
 * Validates request payload against a Zod schema and checks bot honeypot.
 */
export async function validateServerInput<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  options?: {
    honeypotField?: string;
    turnstileToken?: string;
    clientIp?: string;
  }
): Promise<ValidationResult<T>> {
  // 1. Honeypot check
  if (options?.honeypotField && typeof payload === "object" && payload !== null) {
    const honeypotVal = (payload as Record<string, unknown>)[options.honeypotField];
    if (honeypotVal) {
      return {
        success: false,
        errors: { _bot: "Spam detected." },
        response: NextResponse.json(
          { error: "Spam detected." },
          { status: 400 }
        ),
      };
    }
  }

  // 2. Turnstile check if token provided
  if (options?.turnstileToken) {
    const isHuman = await verifyTurnstileToken(options.turnstileToken, options.clientIp);
    if (!isHuman) {
      return {
        success: false,
        errors: { _turnstile: "Bot verification failed. Please refresh and try again." },
        response: NextResponse.json(
          { error: "Bot verification failed." },
          { status: 403 }
        ),
      };
    }
  }

  // 3. Schema validation
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const formattedErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "_global";
      if (!formattedErrors[field]) {
        formattedErrors[field] = issue.message;
      }
    }

    return {
      success: false,
      errors: formattedErrors,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: formattedErrors,
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
