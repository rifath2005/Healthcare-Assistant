import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

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
            Terms of Care, Medical Policy & Sources
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please read these terms carefully before utilizing this platform.
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed space-y-6">
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
              If you or someone in your care is experiencing severe chest pain, sudden numbness or paralysis, uncontrollable bleeding, anaphylaxis, or thoughts of self-harm or suicide, DO NOT rely on this application. Immediately call <strong>112</strong> or <strong>108</strong> (or 911 / 988).
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

          {/* Section 4: Verified Medical Knowledge Sources */}
          <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                4. Verified Medical Knowledge Sources & Evidence Base
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              To guarantee that clinical literacy and symptom guidance remain evidence-grounded and free of generic AI hallucinations, our system retrieves information from verified public health authorities:
            </p>

            <div className="grid grid-cols-1 gap-3 not-prose">
              {/* CDC */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">[1]</span>
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      Centers for Disease Control and Prevention (CDC)
                    </span>
                  </div>
                  <a
                    href="https://www.cdc.gov/headaches"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    cdc.gov <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  CDC: Tension Headaches vs Migraines Clinical Guidelines
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Clinical standards regarding tension cephalalgia vs primary vascular migraine presentations, identifying environmental triggers, and first-line home palliative care (quiet rooms, hydration, rest).
                </p>
              </div>

              {/* MedlinePlus / NIH */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">[2]</span>
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      National Library of Medicine (MedlinePlus / NIH)
                    </span>
                  </div>
                  <a
                    href="https://medlineplus.gov/stress"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    medlineplus.gov <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  MedlinePlus: Managing Acute Stress, Panic & Somatic Distress
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Evidence-based coping protocols for hyperventilation and anxiety responses, incorporating slow 4-7-8 diaphragmatic pacing, 5-4-3-2-1 sensory grounding, and parasympathetic nervous activation.
                </p>
              </div>

              {/* WHO */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">[3]</span>
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      World Health Organization (WHO)
                    </span>
                  </div>
                  <a
                    href="https://www.who.int/respiratory"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    who.int <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  WHO Guidelines: Upper Respiratory Infections & Triage Standards
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Diagnostic standards and triage for upper respiratory tract conditions, viral timeline progression (7-10 days), fluid balance maintenance, and strict avoidance of inappropriate antibiotic self-treatment.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
