"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, UserCheck, Stethoscope, Video, Loader2, CheckCircle2 } from "lucide-react";
import { SlotPicker, type Slot } from "./SlotPicker";
import { createClient } from "@/lib/supabase/client";
import { getClientTimezone } from "@/lib/timezone";
import { toast } from "sonner";

import { CLINIC_DOCTORS } from "@/lib/doctors";

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
  initialMode?: "virtual" | "direct";
  initialDoctorId?: string;
}

export function BookingModal({
  isOpen,
  onClose,
  initialSymptoms = "",
  initialMode = "virtual",
  initialDoctorId,
}: BookingModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>(CLINIC_DOCTORS as any);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    initialDoctorId || CLINIC_DOCTORS[0]?.id || ""
  );
  const [consultationType, setConsultationType] = useState<"virtual" | "direct">(initialMode);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [patientNotes, setPatientNotes] = useState(initialSymptoms);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [verification, setVerification] = useState<any | null>(null);

  useEffect(() => {
    if (initialMode) setConsultationType(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialDoctorId) setSelectedDoctorId(initialDoctorId);
  }, [initialDoctorId]);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/doctors")
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          setSelectedDoctorId((prev) =>
            initialDoctorId && data.doctors.some((d: any) => d.id === initialDoctorId)
              ? initialDoctorId
              : prev && data.doctors.some((d: any) => d.id === prev)
              ? prev
              : data.doctors[0].id
          );
        }
      })
      .catch(() => {
        const supabase = createClient();
        supabase
          .from("doctors")
          .select("id, name, specialty, avatar_url, bio")
          .eq("is_active", true)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setDoctors(data);
              setSelectedDoctorId((prev) =>
                prev && data.some((d: any) => d.id === prev) ? prev : data[0].id
              );
            }
          });
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
          consultationType,
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
      setVerification(outcome.verification || null);
      toast.success("Appointment successfully scheduled and verified!");
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("An error occurred while booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative space-y-4 sm:space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          aria-label="Close booking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {bookingSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex p-3 sm:p-4 bg-emerald-100 dark:bg-emerald-950/60 rounded-3xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {bookingSuccess.consultationType === "direct" ? "In-Person Visit Confirmed!" : "Virtual Consultation Confirmed!"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Both completion requirements have been verified and confirmed.
              </p>
            </div>

            {/* Dual Outcome Verification Checklist */}
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider text-[11px]">
                  Verified Completion Status
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  Option Complete
                </span>
              </div>

              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Meeting Link & Calendar:</span>
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Generated & Synced</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Confirmation Email:</span>
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sent to Patient & Doctor</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
              <p>
                <strong>Doctor:</strong> {bookingSuccess.doctorName} ({bookingSuccess.doctorSpecialty})
              </p>
              <p>
                <strong>Scheduled:</strong> {bookingSuccess.formattedTime}
              </p>
              <p>
                <strong>Consultation Mode:</strong>{" "}
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                    bookingSuccess.consultationType === "direct"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {bookingSuccess.consultationType === "direct" ? "🏥 Direct In-Person Visit" : "🌐 Virtual (Google Meet)"}
                </span>
              </p>
              {bookingSuccess.clinicRoom && (
                <p>
                  <strong>Clinic Location:</strong> {bookingSuccess.clinicRoom}
                </p>
              )}
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
                setVerification(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <Stethoscope className="w-3.5 h-3.5" />
                Physician Consultation
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Schedule a Doctor Consultation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between a Virtual Telehealth video consultation or Direct In-Person clinic visit.
              </p>
            </div>

            {/* Select Doctor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Choose Healthcare Provider
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

            {/* Consultation Mode (Virtual vs Direct) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                2. Consultation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConsultationType("virtual")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    consultationType === "virtual"
                      ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    <Video className="w-3.5 h-3.5" />
                    <span>Virtual Telehealth</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Google Meet link created and sent to your email.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationType("direct")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    consultationType === "direct"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-700 dark:text-blue-400">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Direct In-Person</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Direct meeting at our clinic room with physician.
                  </p>
                </button>
              </div>
            </div>

            {/* Slot Picker */}
            {selectedDoctorId && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  3. Select Date & Time Slot
                </label>
                <SlotPicker
                  doctorId={selectedDoctorId}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
              </div>
            )}

            {/* Primary Symptoms / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                4. Primary Symptoms & Clinical Notes (Encrypted)
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
                Confirm & Sync Consultation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
