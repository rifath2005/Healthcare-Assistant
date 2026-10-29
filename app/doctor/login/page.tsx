"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stethoscope, ShieldCheck, ArrowRight, UserCheck, HeartPulse, Lock } from "lucide-react";
import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";
import { toast } from "sonner";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile>(CLINIC_DOCTORS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"quick" | "credentials">("quick");
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (doctor: DoctorProfile) => {
    setLoading(true);
    try {
      localStorage.setItem("doctor_session", JSON.stringify(doctor));
      document.cookie = `doctor_id=${doctor.id}; path=/; max-age=86400; SameSite=Lax`;
      toast.success(`Welcome back, ${doctor.name}`);
      router.push("/doctor/appointments");
    } catch {
      toast.error("Failed to initialize doctor session");
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your doctor email");
      return;
    }

    setLoading(true);
    // Find matching doctor or match default
    const matched = CLINIC_DOCTORS.find(
      (d) => d.email.toLowerCase() === email.trim().toLowerCase()
    ) || CLINIC_DOCTORS[0];

    localStorage.setItem("doctor_session", JSON.stringify(matched));
    document.cookie = `doctor_id=${matched.id}; path=/; max-age=86400; SameSite=Lax`;
    toast.success(`Signed in as ${matched.name}`);
    router.push("/doctor/appointments");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Doctor & Clinician Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Secure healthcare provider access to manage telehealth & in-person consultations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          {/* Tab selector */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "quick"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Select Clinic Physician
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("credentials")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "credentials"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Provider Credentials
            </button>
          </div>

          {activeTab === "quick" ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your physician profile to view your consultation dashboard:
              </p>

              {CLINIC_DOCTORS.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => handleQuickLogin(doctor)}
                  disabled={loading}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={doctor.avatar_url}
                      alt={doctor.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {doctor.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {doctor.specialty}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        📍 {doctor.clinicRoom}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Doctor Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. elena.rostova@healthcare.local"
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Provider PIN / Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <Lock className="w-4 h-4" />
                Sign In to Doctor Portal
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>← Return to Patient Virtual Assistant</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
