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
import { HeartPulse, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: SignupInput) => {
    setServerError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
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
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        router.push("/");
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

          <FormField
            label="Email Address"
            type="email"
            placeholder="jane@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

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
            disabled={!isValid || loading || isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Account
          </button>
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
