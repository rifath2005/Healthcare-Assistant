"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  Stethoscope,
  ArrowRight,
  User,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEmailGate } from "@/lib/validationArchitecture";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectDestination = searchParams.get("redirect") || "/admin/doctors";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(urlError || null);
  const [emailValidated, setEmailValidated] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (val: string) => {
    // Automatically convert uppercase to lowercase and strip whitespace
    const clean = val.toLowerCase().replace(/\s+/g, "");
    setEmail(clean);
    setEmailError(null);
    setAuthError(null);

    const check = validateEmailGate(clean);
    if (!check.isValid) {
      setEmailValidated(false);
      setPassword("");
    } else {
      setEmailValidated(true);
    }
  };

  const handleValidateEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setAuthError(null);

    const check = validateEmailGate(email);
    if (!check.isValid) {
      setEmailValidated(false);
      setEmailError(check.error || "Please enter a valid, correctly formatted administrator email address.");
      return false;
    }

    setEmailValidated(true);
    setEmailError(null);
    return true;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const check = validateEmailGate(email);
    if (!check.isValid) {
      setEmailValidated(false);
      setEmailError(check.error || "Please enter a valid administrator email address.");
      return;
    }

    if (!password.trim()) {
      setAuthError("Administrator security password is required.");
      toast.error("Credentials required");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = check.normalizedEmail || email.trim().toLowerCase();
      const supabase = createClient();
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (signInError) {
        setAuthError(signInError.message || "Invalid administrative credentials.");
        toast.error("Authentication failed: Access Denied");
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Verify role in profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profile?.role !== "admin") {
          setAuthError(
            `Account '${email}' is authenticated, but does NOT have administrative privileges (Current role: ${profile?.role || "user"}).`
          );
          toast.error("Access Denied: Admin role required");
          setLoading(false);
          return;
        }

        toast.success("Administrator Authenticated. Loading Console...");
        window.location.href = redirectDestination;
      }
    } catch (err: any) {
      console.error("Admin login error:", err);
      setAuthError("Authentication service unreachable. Please try again.");
      toast.error("Login service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Clinical Admin Console
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Restricted access for clinical supervisors, clinic directors, and IT system administrators
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Administrative Sign In
            </span>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold pb-1.5 text-slate-300">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !emailValidated) {
                      e.preventDefault();
                      handleValidateEmail();
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) {
                      handleValidateEmail();
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="admin@healthcare.local or your email"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    emailError
                      ? "border-red-500 focus:border-red-500 bg-red-950/20"
                      : emailValidated
                      ? "border-emerald-500 focus:border-emerald-500"
                      : "border-slate-700 focus:border-emerald-500"
                  }`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                {emailValidated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-3" />
                )}
              </div>
              {emailError ? (
                <p className="text-[11px] text-red-400 pt-1 font-medium">{emailError}</p>
              ) : (
                <p className="text-[11px] text-slate-400 pt-1">
                  Admin email is automatically formatted to lowercase
                </p>
              )}
            </div>

            {/* Email-First Gate: Security Password field is inaccessible until email is validated */}
            {!emailValidated ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleValidateEmail()}
                  className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>Continue to Security Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Security password access is locked until a valid administrator email is entered</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Admin Email Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailValidated(false);
                      setPassword("");
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[11px] underline"
                  >
                    Change Email
                  </button>
                </div>

                <div>
                  <label className="block font-semibold pb-1.5 text-slate-300">
                    Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoFocus
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Authenticating Admin...
                    </>
                  ) : (
                    <>
                      Enter Admin Console
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Quick Account Guidance */}
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Verified Admin Accounts:</p>
            <p className="font-mono text-[10px] text-emerald-400">
              babsword3@gmail.com &bull; admin@healthcare.local
            </p>
          </div>

          {/* Quick Portal Switcher */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link
              href="/doctor/login"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              Doctor Portal &rarr;
            </Link>
            <Link
              href="/login"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              Patient Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
