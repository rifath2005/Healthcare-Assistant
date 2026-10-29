"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatAppointmentTime } from "@/lib/timezone";
import { RescheduleModal } from "@/components/appointment/RescheduleModal";
import { toast } from "sonner";

interface Appointment {
  id: string;
  doctor_id?: string;
  doctor_name: string;
  doctor_specialty: string;
  start_time: string;
  end_time: string;
  status: string;
  meet_link?: string;
  patient_notes?: string;
}

export default function UserAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });

      if (!error && data) {
        const sanitized = data.map((appt: any) => {
          let meetLink = appt.meet_link;
          if (meetLink && !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(meetLink)) {
            meetLink = "https://meet.google.com/doy-knhq-mva";
          }
          return { ...appt, meet_link: meetLink };
        });
        setAppointments(sanitized);
      }
    } catch (e) {
      console.warn("Failed to load appointments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this consultation? Your calendar slot will be released.")) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });

      if (res.ok) {
        toast.success("Appointment cancelled");
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
        );
      } else {
        toast.error("Failed to cancel appointment");
      }
    } catch {
      toast.error("Error cancelling appointment");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                My Healthcare Appointments
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your scheduled virtual consultations and join video calls
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-emerald-600 gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading your consultations...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3 shadow-xs">
            <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Appointments Scheduled
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You haven&apos;t booked any doctor consultations yet. Return to the chat assistant to find a physician.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Start Consultation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((appt) => {
              const isCancelled = appt.status === "cancelled";
              const nowMs = Date.now();
              const startMs = new Date(appt.start_time).getTime();
              const endMs = new Date(appt.end_time).getTime();
              const isLiveNow = nowMs >= (startMs - 15 * 60 * 1000) && nowMs <= endMs;

              return (
                <div
                  key={appt.id}
                  className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 space-y-4 shadow-xs transition-all ${
                    isCancelled
                      ? "border-slate-200 dark:border-slate-800 opacity-60"
                      : isLiveNow
                      ? "border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md"
                      : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {appt.doctor_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {appt.doctor_specialty}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${
                            appt.meet_link
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {appt.meet_link ? "🌐 Virtual Meet" : "🏥 Direct In-Person"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                        isCancelled
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{formatAppointmentTime(appt.start_time)}</span>
                      </div>
                      {isLiveNow && !isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Live Call Active
                        </span>
                      )}
                    </div>

                    {!appt.meet_link && !isCancelled && (
                      <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs">
                        📍 <strong>In-Person Location:</strong> HealthCare Clinic Center, Suite 204. Please arrive 10 minutes before your scheduled appointment.
                      </div>
                    )}
                  </div>

                  {!isCancelled && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {appt.meet_link && (
                        <a
                          href={appt.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                            isLiveNow
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500 ring-offset-2 animate-pulse"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          {isLiveNow ? "🔴 Launch Live Google Meet" : "Join Google Meet"}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setReschedulingAppointment(appt)}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Reschedule appointment to a different time"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Change Time
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {cancellingId === appt.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <RescheduleModal
          isOpen={!!reschedulingAppointment}
          appointment={reschedulingAppointment}
          onClose={() => setReschedulingAppointment(null)}
          onSuccess={(updated) => {
            setAppointments((prev) =>
              prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            );
          }}
        />
      </div>
    </div>
  );
}
