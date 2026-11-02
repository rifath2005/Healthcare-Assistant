"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  HeartPulse,
  Stethoscope,
  Activity,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function HealthProfilePage() {
  const router = useRouter();
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("Prefer not to say");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setFullName(user.user_metadata?.full_name || "");

      // Fetch any existing profile information
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data?.profile) {
            const p = data.profile;
            if (p.health_issues) setHealthIssues(p.health_issues);
            if (p.age) setAge(String(p.age));
            if (p.gender) setGender(p.gender);
            if (p.medical_history) setMedicalHistory(p.medical_history);
            if (p.allergies) setAllergies(p.allergies);
            if (p.medications) setMedications(p.medications);

            // If user already had step 1 completed, allow going directly to step 2
            if (p.health_issues && !p.is_profile_complete) {
              setStep(2);
            }
          }
        })
        .catch((err) => console.warn("Notice loading profile:", err))
        .finally(() => setLoadingInitial(false));
    });
  }, [router]);

  // Step 1: Health Issue Validation Gate
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIssues = healthIssues.trim();
    if (!cleanIssues || cleanIssues.length < 5) {
      setErrorMsg("Please describe your health issue(s) or symptoms in at least 5 characters.");
      toast.error("Health issue description required");
      return;
    }

    setStep(2);
  };

  // Step 2: Complete Profile Submission
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate health issues
    if (!healthIssues.trim() || healthIssues.trim().length < 5) {
      setStep(1);
      setErrorMsg("Please describe your health issue first.");
      return;
    }

    // Validate age
    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge < 1 || parsedAge > 125) {
      setErrorMsg("Please provide a valid age between 1 and 125.");
      toast.error("Valid age required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          health_issues: healthIssues.trim(),
          age: parsedAge,
          gender: gender.trim(),
          medical_history: medicalHistory.trim() || "None reported",
          allergies: allergies.trim() || "None",
          medications: medications.trim() || "None",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save health profile.");
        toast.error("Error saving profile");
        setSubmitting(false);
        return;
      }

      toast.success("Health profile completed successfully!");
      // Route user to the main page and conversational page
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Profile submit exception:", err);
      setErrorMsg("A network error occurred. Please try again.");
      toast.error("Network error");
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading your profile status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mandatory Clinical Intake
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Before accessing the conversational assistant, please complete your health profile so our clinical AI can safely personalize your guidance.
          </p>

          {/* Stepper Progress */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 1
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Health Issue
              </span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 2
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Patient Details
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800">
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Describe Health Issue(s) */}
          {step === 1 && (
            <form onSubmit={handleProceedToStep2} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Step 1: Primary Health Concern
                  </span>
                </div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Describe what health issue or symptoms you are experiencing today:
                </label>
                <textarea
                  rows={4}
                  required
                  value={healthIssues}
                  onChange={(e) => setHealthIssues(e.target.value)}
                  placeholder="e.g., I've had persistent sharp chest tightness and dizziness since yesterday afternoon, along with trouble sleeping..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Please be specific about onset, duration, or any physical discomfort (minimum 5 characters).
                </p>
              </div>

              {/* Quick sample chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Common categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Persistent migraines and eye strain",
                    "Chronic anxiety and rapid heartbeat",
                    "Lower back strain and stiffness",
                    "Skin rash and allergic itching",
                    "Fever, sore throat, and fatigue",
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setHealthIssues(sample)}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 text-left"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!healthIssues.trim() || healthIssues.trim().length < 5}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
                >
                  <span>Next: Enter Patient Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Remaining Profile Fields (Age, History, etc.) */}
          {step === 2 && (
            <form onSubmit={handleCompleteProfile} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Step 2: Clinical Details
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Health Issue</span>
                </button>
              </div>

              {/* Summary of stated health issue from step 1 */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Stated Health Issue (Step 1)
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{healthIssues}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Biological Sex / Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary / Other">Non-binary / Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Medical History & Pre-existing Conditions
                </label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g., Hypertension, Type 2 Diabetes, Asthma, or None"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Known Allergies (Optional)
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Pollen, None"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Medications (Optional)
                  </label>
                  <input
                    type="text"
                    value={medications}
                    onChange={(e) => setMedications(e.target.value)}
                    placeholder="e.g. Metformin, Lisinopril, None"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 px-4 rounded-xl font-semibold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || !age}
                  className="w-2/3 py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Complete & Start Consultation</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
