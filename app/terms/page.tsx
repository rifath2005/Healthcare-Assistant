import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle } from "lucide-react";

export default function TermsOfServicePage() {
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
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Terms of Care & Medical Disclaimer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please read these terms carefully before utilizing this platform.
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>NON-DIAGNOSTIC ADVISORY WARNING</span>
            </div>
            <p>
              This conversational AI platform provides educational health literacy and wellness information based on public health documents. It is <strong>NOT</strong> an FDA-cleared diagnostic device and does <strong>NOT</strong> substitute for the clinical evaluation, diagnosis, or treatment provided by a certified medical doctor.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Emergency Situations</h2>
            <p>
              If you or someone in your care is experiencing severe chest pain, sudden numbness or paralysis, uncontrollable bleeding, anaphylaxis, or thoughts of self-harm or suicide, DO NOT rely on this application. Immediately call <strong>911</strong> or text/call <strong>988</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. No Doctor-Patient Relationship</h2>
            <p>
              Interacting with this AI assistant does not constitute or create a physician-patient relationship. Video consultations scheduled via Google Calendar connect you with independent physicians who maintain their own clinical standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. User Conduct & Acceptable Use</h2>
            <p>
              You agree not to submit fraudulent bookings, execute automated spam bots, or attempt prompt injection or jailbreaking attacks against the LLM pipeline.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
