"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { BotProtection } from "@/components/auth/BotProtection";
import { createClient } from "@/lib/supabase/client";
import { syncGuestSession } from "@/lib/supabase/syncGuestSession";
import { HeartPulse, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectDestination = searchParams.get("redirect") || "/";

  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setUnverifiedEmail(data.email);
          setServerError("Your email address has not been verified yet.");
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          setServerError("Invalid email or password. Please verify your credentials.");
        } else {
          setServerError(error.message);
        }
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");

      if (authData.user) {
        await syncGuestSession(authData.user.id);
      }

      router.push(redirectDestination);
      router.refresh();
    } catch (err: unknown) {
      console.error("Login exception:", err);
      setServerError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendingEmail(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      if (res.ok) {
        toast.success("Verification link sent! Please check your inbox.");
      } else {
        toast.error("Failed to resend verification email.");
      }
    } catch {
      toast.error("Error resending email.");
    } finally {
      setResendingEmail(false);
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
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log in to access your consultations and health history
          </p>
        </div>

        {serverError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:no-underline text-xs flex items-center gap-1"
              >
                {resendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Resend verification email
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-emerald-500"
                {...register("rememberMe")}
              />
              <label htmlFor="rememberMe" className="text-slate-600 dark:text-slate-400 select-none">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <BotProtection />

          <button
            type="submit"
            disabled={!isValid || loading || isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign In
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

        <GoogleAuthButton label="Sign in with Google" />

        <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
