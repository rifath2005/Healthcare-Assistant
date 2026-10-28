import React from "react";
import Link from "next/link";
import { HeartPulse, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-5">
        <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-3xl text-emerald-600 dark:text-emerald-400">
          <HeartPulse className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The healthcare page or consultation thread you requested does not exist or has been relocated.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Assistant
        </Link>
      </div>
    </div>
  );
}
