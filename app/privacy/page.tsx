import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Privacy Policy & Data Minimization
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Effective Date: October 2026 | Smart Healthcare Assistant
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed space-y-4">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Core Privacy Commitments</h2>
            <p>
              The Smart Healthcare Assistant is built upon the principle of <strong>Privacy by Design</strong>. We recognize the profound sensitivity of health disclosures and adhere strictly to data minimization, column encryption at rest, and tenant isolation principles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Guest vs. Authenticated User Data</h2>
            <p>
              <strong>Anonymous / Guest Sessions:</strong> When interacting as an unauthenticated guest, your messages and symptom inputs are stored strictly inside your local browser storage (`localStorage`). We do not retain persistent database logs of guest inquiries unless you choose to register an account.
            </p>
            <p>
              <strong>Authenticated Sessions:</strong> When you register and log in, your conversation threads and appointments are committed to Supabase tables protected by PostgreSQL Row-Level Security (RLS). Only your authenticated session token can query or modify your records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Field-Level Clinical Encryption</h2>
            <p>
              All sensitive clinical free-text entries, including patient consultation notes and emotional wellness entries, are encrypted at rest using AES-256-GCM authenticated encryption before database storage.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Your Right to Erasure (GDPR & CCPA)</h2>
            <p>
              You maintain total sovereignty over your health disclosures. At any time, you can visit the <strong>Account Settings</strong> page to permanently purge your account and all linked conversation transcripts, mood records, and scheduled visits. This deletion is instantaneous and irreversible.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
