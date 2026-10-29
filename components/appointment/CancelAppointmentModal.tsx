"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Clock, Calendar, Mail, Loader2, CheckCircle2, Video, MapPin } from "lucide-react";
import { formatAppointmentTime } from "@/lib/timezone";

export interface CancelModalAppointment {
  id: string;
  patientName?: string;
  patientEmail?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  start_time: string;
  consultationType?: "virtual" | "direct";
  meet_link?: string;
  clinicRoom?: string;
}

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: CancelModalAppointment | null;
  onConfirmCancel: (appointmentId: string, reason: string) => Promise<boolean | void>;
  role?: "doctor" | "patient";
}

const PRESET_REASONS = [
  "Clinical schedule conflict",
  "Physician emergency in clinic",
  "Patient requested cancellation / rescheduling",
  "Specialist referral recommended",
  "Unforeseen medical department meeting",
];

export function CancelAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onConfirmCancel,
  role = "doctor",
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("Clinical schedule conflict");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason(role === "doctor" ? "Clinical schedule conflict" : "Personal schedule conflict");
      setSubmitting(false);
    }
  }, [isOpen, role]);

  if (!isOpen || !appointment) return null;

  const isVirtual = appointment.consultationType === "virtual" || Boolean(appointment.meet_link);
  const formattedTime = formatAppointmentTime(appointment.start_time);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmCancel(appointment.id, reason.trim());
      onClose();
    } catch (err) {
      console.error("Cancellation modal error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-950/60 shadow-2xl p-6 space-y-5 overflow-hidden relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 rounded-2xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cancel Consultation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {role === "doctor"
                  ? "Cancel appointment and notify the patient via email"
                  : "Cancel your scheduled appointment and release the slot"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appointment Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">
              {role === "doctor"
                ? `Patient: ${appointment.patientName || "Patient"}`
                : `Doctor: ${appointment.doctor_name || "Doctor"}`}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] flex items-center gap-1 ${
                isVirtual
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
              }`}
            >
              {isVirtual ? (
                <>
                  <Video className="w-3 h-3" /> Virtual
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3" /> In-Person
                </>
              )}
            </span>
          </div>

          {appointment.patientEmail && role === "doctor" && (
            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{appointment.patientEmail}</span>
            </div>
          )}

          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{formattedTime}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select or Enter Reason for Cancellation:
            </label>

            {/* Quick preset chips */}
            {role === "doctor" && (
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      reason === preset
                        ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Provide a clear cancellation reason..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all"
            />
          </div>

          {/* Email dispatch notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Automated Notification</p>
              <p className="text-[11px] opacity-90">
                {role === "doctor"
                  ? "An email containing this reason and convenient rebooking options will be dispatched to the patient immediately."
                  : "Your attending physician will be notified, and any associated Google Calendar slot will be released."}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cancelling &amp; Notifying...
                </>
              ) : (
                <>Confirm Cancellation</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
