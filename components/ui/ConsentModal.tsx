"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CONSENT_STORAGE_KEY = "healthcare_disclaimer_accepted";

export function ConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // Check localStorage first
    const localConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!localConsent) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = async () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    setIsOpen(false);

    // Sync to Supabase profile if user is currently logged in
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ has_accepted_disclaimer: true, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("Could not sync consent to profile:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Medical Disclaimer & Terms of Care
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please review before interacting with the assistant
            </p>
          </div>
        </div>

        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 20) {
              setHasScrolledTerms(true);
            }
          }}
          className="text-xs text-slate-600 dark:text-slate-300 space-y-3 max-h-56 overflow-y-auto pr-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
        >
          <p>
            <strong>1. Not a Medical Device:</strong> The Smart Healthcare Assistant is an AI-powered conversational platform intended solely for informational, wellness, and preliminary triage education. It is <strong>NOT</strong> an FDA-cleared diagnostic device and does not establish a formal doctor-patient relationship.
          </p>
          <p>
            <strong>2. Emergency Triage:</strong> If you are experiencing symptoms of a heart attack (severe crushing chest pain), stroke (facial drooping, sudden slurred speech), severe bleeding, or acute suicidal distress, DO NOT rely on this application. Immediately call <strong>112</strong> or <strong>108</strong> (emergency services / 911 / 988).
          </p>
          <p>
            <strong>3. Privacy & Data Minimization:</strong> Anonymous guest conversations are stored temporarily in your local browser. If you register or authenticate, clinical dialogues are encrypted and isolated via PostgreSQL Row-Level Security.
          </p>
          <p>
            <strong>4. Grounded in Verified Medical Sources:</strong> Educational health guidance is grounded in public clinical guidelines from the <strong>Centers for Disease Control and Prevention (CDC)</strong>, the <strong>National Library of Medicine (MedlinePlus / NIH)</strong>, and the <strong>World Health Organization (WHO)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="modal-consent-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <label
            htmlFor="modal-consent-checkbox"
            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            I understand this platform does not provide diagnostic decisions and agree to the terms.
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={!agreed}
            onClick={handleAccept}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
