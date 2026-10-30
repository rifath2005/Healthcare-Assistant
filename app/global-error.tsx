"use client";

import React, { useEffect } from "react";
import { HeartPulse, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 min-h-screen flex items-center justify-center p-6 text-slate-900">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="inline-flex p-4 bg-emerald-50 rounded-3xl text-emerald-600">
            <HeartPulse className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              Smart Healthcare Assistant
            </h2>
            <p className="text-xs text-slate-500">
              An unexpected error interrupted your session. Please reload to resume your consultation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reload Assistant
          </button>
        </div>
      </body>
    </html>
  );
}
