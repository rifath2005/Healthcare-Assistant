"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-3xl text-emerald-600 dark:text-emerald-400">
          <MailCheck className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Check Your Inbox</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We sent a verification confirmation link to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {email || "your email address"}
            </span>
            .
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-left space-y-2">
          <p>
            <strong>Next Steps:</strong>
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Click the link in the email to activate your healthcare profile.</li>
            <li>If you do not see it in a few minutes, check your spam or junk folder.</li>
          </ul>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
