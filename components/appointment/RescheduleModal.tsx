"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { SlotPicker, type Slot } from "./SlotPicker";
import { getClientTimezone, formatAppointmentTime } from "@/lib/timezone";
import { toast } from "sonner";

export interface RescheduleAppointmentData {
  id: string;
  doctor_id?: string;
  doctor_name: string;
  doctor_specialty: string;
  start_time: string;
  end_time: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: RescheduleAppointmentData | null;
  onSuccess: (updatedAppointment: any) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  // Fallback doctor ID if doctor_id wasn't stored on legacy record
  const doctorId = appointment.doctor_id || "11111111-1111-1111-1111-111111111111";

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) {
      toast.error("Please select a new consultation time slot.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          doctorId: appointment.doctor_id,
          newStartTime: selectedSlot.start,
          newEndTime: selectedSlot.end,
          timezone: getClientTimezone(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to reschedule appointment.");
        return;
      }

      toast.success("Appointment rescheduled successfully!");
      onSuccess(data.appointment);
      onClose();
    } catch (err) {
      console.error("Reschedule request error:", err);
      toast.error("An error occurred while rescheduling your consultation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 overflow-hidden relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Reschedule Consultation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a new date and 30-minute time slot for your appointment
            </p>
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

        {/* Current Appointment Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {appointment.doctor_name}
            </span>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {appointment.doctor_specialty}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Currently: {formatAppointmentTime(appointment.start_time)}</span>
          </div>
        </div>

        {/* Slot Picker Component */}
        <div className="flex-1 overflow-y-auto pr-1">
          <SlotPicker
            doctorId={doctorId}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
          />
        </div>

        {/* Selected Slot Summary */}
        {selectedSlot && (
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-medium">New Selected Slot:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {selectedSlot.displayTime}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Keep Current
          </button>
          <button
            type="button"
            onClick={handleConfirmReschedule}
            disabled={!selectedSlot || submitting}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Rescheduling...
              </>
            ) : (
              <>
                Confirm New Slot
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
