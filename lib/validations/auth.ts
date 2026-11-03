import { z } from "zod";

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

/**
 * Strict RFC 5322 compliant email regex:
 * Requires valid local part, @, domain name with dots, and at least 2 alpha char TLD.
 * Forbids internal spaces and consecutive dots.
 */
export const STRICT_EMAIL_REGEX = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i;

export function isValidEmailFormat(email: unknown): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 254) return false;
  if (/\s/.test(clean)) return false;
  if (clean.includes("..")) return false;
  return STRICT_EMAIL_REGEX.test(clean);
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((val) => isValidEmailFormat(val), {
    message: "Please provide a valid, correctly formatted email address (e.g. name@domain.com)",
  });

export function validateEmailFormat(email: string | null | undefined): {
  isValid: boolean;
  normalized?: string;
  error?: string;
} {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { isValid: false, error: "Email address is required." };
  }

  const clean = email.trim().toLowerCase();

  if (/\s/.test(clean)) {
    return {
      isValid: false,
      error: "Email address cannot contain spaces.",
    };
  }

  if (clean.includes("..")) {
    return {
      isValid: false,
      error: "Email address cannot contain consecutive dots.",
    };
  }

  if (!isValidEmailFormat(clean)) {
    return {
      isValid: false,
      error: "Please enter a valid, correctly formatted email address (e.g. name@domain.com).",
    };
  }

  return { isValid: true, normalized: clean };
}

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s.'-]+$/, "Full name must only contain letters, spaces, dots, hyphens, or apostrophes"),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the medical disclaimer and terms of service" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
