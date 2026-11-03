"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { validateDoctorCredentials } from "@/lib/doctors";
import { validateDoctorIdentifierGate } from "@/lib/validationArchitecture";
import { toast } from "sonner";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailValidated, setEmailValidated] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (val: string) => {
    // Automatically convert any uppercase characters to lowercase and strip whitespace
    const clean = val.toLowerCase().replace(/\s+/g, "");
    setEmail(clean);
    setEmailError(null);
    setAuthError(null);

    const validation = validateDoctorIdentifierGate(clean);
    if (!validation.isValid) {
      setEmailValidated(false);
      setPassword("");
    } else {
      setEmailValidated(true);
    }
  };

  const handleValidateIdentifier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setAuthError(null);

    const validation = validateDoctorIdentifierGate(email);
    if (!validation.isValid) {
      setEmailValidated(false);
      setEmailError(validation.error || "Please enter a valid physician work email or clinical code.");
      return false;
    }

    setEmailValidated(true);
    setEmailError(null);
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateDoctorIdentifierGate(email);
    if (!validation.isValid) {
      setEmailValidated(false);
      setEmailError(validation.error || "Please enter a valid physician work email or clinical code.");
      return;
    }

    if (!password.trim()) {
      setAuthError("Provider security PIN is required.");
      toast.error("Credentials required");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = validation.normalized || email.trim().toLowerCase();
      const res = await fetch("/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.doctor) {
        setAuthError(data.error || "Invalid clinician credentials. Verify your provider work email or clinical code and security PIN.");
        toast.error("Authentication failed: Access Denied");
        setLoading(false);
        return;
      }

      const doctor = data.doctor;
      localStorage.setItem("doctor_session", JSON.stringify(doctor));
      document.cookie = `doctor_id=${doctor.id}; path=/; max-age=86400; SameSite=Lax`;

      toast.success(`Physician Authenticated: Welcome, ${doctor.name}`);
      router.push("/doctor/appointments");
    } catch (err) {
      console.error("Clinical login error:", err);
      setAuthError("Clinical authentication service unreachable. Contact IT operations.");
      toast.error("Login service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Clinician Provider Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Restricted access for certified physicians and clinical attending staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Provider Authentication
            </span>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Physician Work Email or Clinical Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !emailValidated) {
                      e.preventDefault();
                      handleValidateIdentifier();
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) {
                      handleValidateIdentifier();
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="e.g. elena.rostova@healthcare.local or DR-ROSTOVA-102"
                  autoComplete="username"
                  className={`w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    emailError
                      ? "border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-300 bg-red-50/20"
                      : emailValidated
                      ? "border-emerald-500 focus:ring-emerald-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                  }`}
                />
                {emailValidated && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              {emailError ? (
                <p className="text-[11px] text-red-500 font-medium">{emailError}</p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Provider email or code is automatically converted to lowercase
                </p>
              )}
            </div>

            {/* Email-First Gate: Security PIN input is inaccessible until email/ID is verified */}
            {!emailValidated ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleValidateIdentifier()}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <span>Continue to Security PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 pt-0.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Security PIN access is locked until a valid provider email is entered</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Provider Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailValidated(false);
                      setPassword("");
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] underline"
                  >
                    Change ID
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Provider Security PIN / Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      autoFocus
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Provider Access...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Sign In to Clinical Schedule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* New Doctor Listing Request & Credentialing Callout */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                New Physician or Specialist?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Submit your medical license and proof of qualification for administrative review to be listed in our directory.
              </p>
              <Link
                href="/doctor/apply"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 underline underline-offset-2 pt-0.5 transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Apply for Doctor Listing &amp; Verification
              </Link>
            </div>
          </div>

          <div className="pt-2 text-center space-y-2.5">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>HIPAA Compliant Session &bull; 256-bit Encrypted Workstation</span>
            </p>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <Link
                href="/doctor/verification"
                className="hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
              >
                Check Verification Status
              </Link>
              <span>&bull;</span>
              <Link
                href="/"
                className="hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
              >
                Return to Public Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
