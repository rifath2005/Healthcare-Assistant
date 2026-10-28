"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Clock,
  ShieldAlert,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatAppointmentTime } from "@/lib/timezone";
import { toast } from "sonner";

interface CrisisLog {
  id: string;
  user_id?: string;
  trigger_text: string;
  detected_severity: string;
  reviewed: boolean;
  reviewer_notes?: string;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
}

export default function AdminCrisisLogsPage() {
  const [logs, setLogs] = useState<CrisisLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CrisisLog | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadCrisisLogs = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("crisis_logs")
        .select("*, profiles!crisis_logs_user_id_fkey(full_name, email)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data as any);
      }
    } catch (e) {
      console.warn("Failed to load crisis logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrisisLogs();
  }, []);

  const handleSelectLog = (log: CrisisLog) => {
    setSelectedLog(log);
    setReviewerNotes(log.reviewer_notes || "");
  };

  const handleSaveReview = async () => {
    if (!selectedLog) return;
    setSavingNote(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("crisis_logs")
        .update({
          reviewed: true,
          reviewer_notes: reviewerNotes,
        })
        .eq("id", selectedLog.id);

      if (error) throw error;

      toast.success("Clinical review recorded");
      setLogs((prev) =>
        prev.map((l) =>
          l.id === selectedLog.id
            ? { ...l, reviewed: true, reviewer_notes: reviewerNotes }
            : l
        )
      );
      setSelectedLog((prev) =>
        prev ? { ...prev, reviewed: true, reviewer_notes: reviewerNotes } : null
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update review record");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          Crisis Safety Incident Logs
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Clinical audit trail of pre-execution safety interceptions for self-harm or acute emergency keywords
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logs List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="py-20 flex justify-center text-emerald-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Zero safety crisis incidents recorded. The system is operating normally.
            </div>
          ) : (
            logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => handleSelectLog(log)}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-50/50 dark:bg-red-950/30 border-red-500 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.detected_severity === "emergency"
                              ? "bg-red-600 text-white"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {log.detected_severity}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatAppointmentTime(log.created_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                        &quot;{log.trigger_text}&quot;
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.reviewed
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {log.reviewed ? "Reviewed" : "Pending Audit"}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      User: {log.profiles?.full_name || log.profiles?.email || "Anonymous Guest"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reviewer Detail Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xs h-fit">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Clinical Incident Review
          </h2>

          {selectedLog ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 font-semibold">Incident Identifier</p>
                <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                  {selectedLog.id}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-slate-500 font-semibold">Intercepted Inbound Prompt</p>
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-900 dark:text-red-200 italic font-medium">
                  &quot;{selectedLog.trigger_text}&quot;
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                  Clinician Audit & Follow-Up Notes
                </label>
                <textarea
                  rows={4}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Document clinician outreach, crisis lifeline recommendation, or case closure notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveReview}
                disabled={savingNote}
                className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Sign Off & Mark Reviewed
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select an incident from the log to inspect details and document clinician follow-ups.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
