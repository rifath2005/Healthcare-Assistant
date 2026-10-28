"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, UserCheck, Stethoscope, Video, Loader2, CheckCircle2 } from "lucide-react";
import { SlotPicker, type Slot } from "./SlotPicker";
import { createClient } from "@/lib/supabase/client";
import { getClientTimezone } from "@/lib/timezone";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar_url?: string;
  bio?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymptoms?: string;
}

export function BookingModal({ isOpen, onClose, initialSymptoms = "" }: BookingModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [patientNotes, setPatientNotes] = useState(initialSymptoms);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    supabase
      .from("doctors")
      .select("id, name, specialty, avatar_url, bio")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDoctors(data);
          setSelectedDoctorId(data[0].id);
        }
      });
  }, [isOpen]);

  const handleBook = async () => {
    if (!selectedDoctorId || !selectedSlot) {
      toast.error("Please choose a physician and time slot");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          patientNotes,
          timezone: getClientTimezone(),
        }),
      });

      const outcome = await res.json();
      if (!res.ok) {
        toast.error(outcome.error || "Failed to confirm booking");
        setLoading(false);
        return;
      }

      setBookingSuccess(outcome.appointment);
      toast.success("Appointment successfully scheduled!");
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("An error occurred while booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          aria-label="Close booking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {bookingSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex p-4 bg-emerald-100 dark:bg-emerald-950/60 rounded-3xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Consultation Confirmed!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A calendar invitation and confirmation email have been dispatched.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
              <p>
                <strong>Doctor:</strong> {bookingSuccess.doctorName} ({bookingSuccess.doctorSpecialty})
              </p>
              <p>
                <strong>Scheduled:</strong> {bookingSuccess.formattedTime}
              </p>
              {bookingSuccess.meetLink && (
                <div className="pt-2">
                  <a
                    href={bookingSuccess.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    <Video className="w-4 h-4" />
                    Open Google Meet Link
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setBookingSuccess(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <Stethoscope className="w-3.5 h-3.5" />
                Telehealth Consultation
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Schedule a Doctor Consultation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect virtually with a certified healthcare provider via Google Meet
              </p>
            </div>

            {/* Select Doctor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Healthcare Provider
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Slot Picker */}
            {selectedDoctorId && (
              <SlotPicker
                doctorId={selectedDoctorId}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}

            {/* Primary Symptoms / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Symptoms & Clinical Notes (Encrypted at rest)
              </label>
              <textarea
                rows={2}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="E.g., Tension headaches for 3 days, sensitivity to light..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleBook}
                disabled={!selectedSlot || loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Confirm & Sync Google Calendar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
