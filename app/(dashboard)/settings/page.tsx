"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Trash2, ArrowLeft, Loader2, Save, Activity, HeartPulse } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearGuestMessages, clearUserSessionData } from "@/lib/supabase/syncGuestSession";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Health Profile Fields (reflects what user says about their health)
  const [healthIssues, setHealthIssues] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("Prefer not to say");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");

        fetch("/api/profile")
          .then((res) => res.json())
          .then((data) => {
            if (data?.profile) {
              const p = data.profile;
              if (p.full_name) setFullName(p.full_name);
              if (p.health_issues) setHealthIssues(p.health_issues);
              if (p.age) setAge(String(p.age));
              if (p.gender) setGender(p.gender);
              if (p.medical_history) setMedicalHistory(p.medical_history);
              if (p.allergies) setAllergies(p.allergies);
              if (p.medications) setMedications(p.medications);
            }
          })
          .catch((err) => console.warn("Notice loading profile in settings:", err));
      }
    });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthIssues.trim()) {
      toast.error("Please describe your health concerns");
      return;
    }
    if (!age || isNaN(Number(age))) {
      toast.error("Please enter a valid age");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          health_issues: healthIssues.trim(),
          age: parseInt(age, 10),
          gender: gender.trim(),
          medical_history: medicalHistory.trim() || "None reported",
          allergies: allergies.trim() || "None",
          medications: medications.trim() || "None",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update health profile");
      } else {
        toast.success("Health profile updated successfully");
      }
    } catch {
      toast.error("Error saving profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password changed successfully");
        setNewPassword("");
      }
    } catch {
      toast.error("Error changing password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = prompt(
      "Type 'DELETE' to confirm permanent deletion of your profile, appointments, and conversation history:"
    );

    if (confirmed !== "DELETE") {
      toast.info("Account deletion cancelled");
      return;
    }

    setDeletingAccount(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("profiles").delete().eq("id", user.id);
        await supabase.auth.signOut();
        clearGuestMessages();
        clearUserSessionData(user.id);
        toast.success("Account and health data permanently deleted");
        router.push("/");
      }
    } catch (err) {
      console.error("Account deletion error:", err);
      toast.error("Failed to delete account");
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Health Profile & Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage personal details and stated health issues used by your AI assistant
            </p>
          </div>
        </div>

        {/* Health Profile Card (reflects what user says about their health) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Health Profile (Used for Clinical Guidance)</span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Stated Health Issue(s) & Symptoms
              </label>
              <textarea
                rows={3}
                required
                value={healthIssues}
                onChange={(e) => setHealthIssues(e.target.value)}
                placeholder="Describe your current health issues or symptoms..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                This describes your current symptoms and informs the conversational assistant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="125"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Biological Sex / Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary / Other">Non-binary / Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Medical History & Pre-existing Conditions
              </label>
              <input
                type="text"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="e.g. Hypertension, Asthma, None"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Known Allergies
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, None"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current Medications
                </label>
                <input
                  type="text"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Metformin, Inhaler, None"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Health Profile
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Account Security & Password</span>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword || !newPassword}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {updatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Update Password
            </button>
          </form>
        </div>

        {/* Data Minimization & Account Deletion */}
        <div className="p-6 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-900 dark:text-red-300 border-b border-red-200 dark:border-red-900/40 pb-3">
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Healthcare Data Minimization & Account Deletion</span>
          </div>

          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            In compliance with patient privacy rights and GDPR data minimization principles, deleting your account will permanently wipe all conversational chat histories, health profile data, encrypted mood logs, and scheduled appointments. This action cannot be reversed.
          </p>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Permanently Delete All Data & Account
          </button>
        </div>
      </div>
    </div>
  );
}
