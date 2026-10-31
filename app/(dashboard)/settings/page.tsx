"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Trash2, ArrowLeft, Loader2, Save, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearGuestMessages, clearUserSessionData } from "@/lib/supabase/syncGuestSession";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || "");
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) setFullName(data.full_name);
          });
      }
    });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update profile name");
      } else {
        toast.success("Profile updated successfully");
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
        // Cascade delete on profiles deletes conversations, appointments, messages
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Account & Privacy Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage personal details and GDPR-compliant data minimization
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Profile Information</span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address (Account Identifier)
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
              Save Changes
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Update Password</span>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
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
            In compliance with patient privacy rights and GDPR data minimization principles, deleting your account will permanently wipe all conversational chat histories, encrypted mood logs, and scheduled appointments. This action cannot be reversed.
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
