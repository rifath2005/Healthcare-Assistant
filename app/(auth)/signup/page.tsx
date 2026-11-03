"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { BotProtection } from "@/components/auth/BotProtection";
import { createClient } from "@/lib/supabase/client";
import { syncGuestSession } from "@/lib/supabase/syncGuestSession";
import { HeartPulse, Loader2, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { validateEmailGate } from "@/lib/validationArchitecture";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [emailInput, setEmailInput] = useState("");
  const [emailValidated, setEmailValidated] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const handleEmailChange = (val: string) => {
    // Automatically convert any uppercase input into lowercase and strip whitespace
    const clean = val.toLowerCase().replace(/\s+/g, "");
    setEmailInput(clean);
    setEmailError(null);
    setServerError(null);

    const validation = validateEmailGate(clean);
    if (!validation.isValid) {
      setEmailValidated(false);
      setValue("email", "");
      setValue("password", "");
      setValue("confirmPassword", "");
    } else {
      setEmailValidated(true);
      setValue("email", validation.normalizedEmail || clean, { shouldValidate: true });
    }
  };

  const handleValidateEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setServerError(null);

    const validation = validateEmailGate(emailInput);
    if (!validation.isValid) {
      setEmailValidated(false);
      setEmailError(validation.error || "Please provide a valid, correctly formatted email address.");
      return false;
    }

    setEmailValidated(true);
    setEmailError(null);
    setValue("email", validation.normalizedEmail || emailInput, { shouldValidate: true });
    return true;
  };

  const onSubmit = async (data: SignupInput) => {
    const emailGate = validateEmailGate(data.email);
    if (!emailGate.isValid) {
      setEmailValidated(false);
      setEmailError(emailGate.error || "Please enter a valid email address.");
      return;
    }

    setServerError(null);
    setLoading(true);

    try {
      const normalizedEmail = emailGate.normalizedEmail || data.email.trim().toLowerCase();
      const supabase = createClient();

      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

      const { data: authData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            role: "user",
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setServerError("An account with this email already exists. Please log in.");
        } else {
          setServerError(error.message);
        }
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");

      if (authData.user) {
        // Sync any guest chat history
        await syncGuestSession(authData.user.id);
      }

      // If email confirmation required
      if (authData.session === null) {
        router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
      } else {
        window.location.href = "/";
      }
    } catch (err: unknown) {
      console.error("Signup exception:", err);
      setServerError("An unexpected error occurred during registration. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create Patient Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign up for personalized health guidance and doctor scheduling
          </p>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Full Name"
            placeholder="Jane Doe"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <div className="space-y-1.5 w-full">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="jane@example.com"
                value={emailInput}
                onChange={(e) => handleEmailChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !emailValidated) {
                    e.preventDefault();
                    handleValidateEmail();
                  }
                }}
                onBlur={() => {
                  if (emailInput.trim()) {
                    handleValidateEmail();
                  }
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                  emailError || errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : emailValidated
                    ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
                    : "border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                }`}
              />
              {emailValidated && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            {emailError || errors.email ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {emailError || errors.email?.message}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email is automatically formatted to lowercase
              </p>
            )}
          </div>

          {/* Email Validation Gate: Password fields are locked until email is valid */}
          {!emailValidated ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleValidateEmail()}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <span>Continue to Password Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 pt-0.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Password setup is locked until a valid email address is entered</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Email Verified
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailValidated(false);
                    setValue("password", "");
                    setValue("confirmPassword", "");
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] underline"
                >
                  Change Email
                </button>
              </div>

              <PasswordInput
                label="Password"
                placeholder="••••••••"
                showStrength
                error={errors.password?.message}
                {...register("password")}
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <div className="space-y-1">
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-emerald-500"
                    {...register("terms")}
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-slate-600 dark:text-slate-400 leading-normal select-none"
                  >
                    I agree to the{" "}
                    <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 underline">
                      Terms of Care
                    </Link>{" "}
                    and acknowledge the non-diagnostic medical disclaimer.
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.terms.message}</p>
                )}
              </div>

              <BotProtection onVerify={setTurnstileToken} />

              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Account
              </button>
            </div>
          )}
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium">
              OR continue with
            </span>
          </div>
        </div>

        <GoogleAuthButton label="Sign up with Google" />

        <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
