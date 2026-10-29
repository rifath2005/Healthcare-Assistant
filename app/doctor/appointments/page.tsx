"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  LogOut,
  RefreshCw,
  Loader2,
  ExternalLink,
  MapPin,
  FileText,
  Search,
} from "lucide-react";
import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";
import { formatAppointmentTime } from "@/lib/timezone";
import { RescheduleModal } from "@/components/appointment/RescheduleModal";
import { toast } from "sonner";

interface DoctorAppointment {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  start_time: string;
  end_time: string;
  status: string;
  meet_link?: string;
  patient_notes?: string;
  decryptedNotes?: string;
  consultationType: "virtual" | "direct";
  clinicRoom: string;
  patientName: string;
  patientEmail: string;
}

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const [currentDoctor, setCurrentDoctor] = useState<DoctorProfile | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "virtual" | "direct">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<any | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(true);

  // Initialize doctor session
  useEffect(() => {
    const sessionStr = typeof window !== "undefined" ? localStorage.getItem("doctor_session") : null;
    if (sessionStr) {
      try {
        const doc = JSON.parse(sessionStr);
        setCurrentDoctor(doc);
      } catch {
        router.replace("/doctor/login");
      }
    } else {
      router.replace("/doctor/login");
    }
  }, [router]);

  const loadDoctorAppointments = async (docId?: string) => {
    const id = docId || currentDoctor?.id;
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/appointments?doctorId=${id}`);
      const data = await res.json();
      if (data.appointments) {
        setAppointments(data.appointments);
      }
      if (typeof data.googleCalendarConnected === "boolean") {
        setGoogleCalendarConnected(data.googleCalendarConnected);
      }
    } catch (err) {
      console.error("Failed to fetch doctor appointments:", err);
      toast.error("Error loading doctor schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentDoctor?.id) {
      loadDoctorAppointments(currentDoctor.id);
    }
  }, [currentDoctor?.id]);

  const handleSignOut = () => {
    localStorage.removeItem("doctor_session");
    document.cookie = "doctor_id=; path=/; max-age=0";
    toast.success("Signed out of Doctor Portal");
    router.push("/doctor/login");
  };

  // 1-Click Accept Appointment
  const handleAcceptAppointment = async (apptId: string) => {
    setActionLoadingId(apptId);
    try {
      const res = await fetch("/api/doctor/appointments/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptId,
          doctorId: currentDoctor?.id,
        }),
      });

      const outcome = await res.json();
      if (res.ok) {
        toast.success("Appointment accepted! Confirmation emails dispatched to patient and doctor.");
        setAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status: "confirmed" } : a))
        );
      } else {
        toast.error(outcome.error || "Failed to accept appointment");
      }
    } catch {
      toast.error("Error accepting appointment");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark Completed or Cancelled
  const handleUpdateStatus = async (apptId: string, status: "completed" | "cancelled") => {
    if (status === "cancelled" && !confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    setActionLoadingId(apptId);
    try {
      const res = await fetch("/api/doctor/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: apptId, status }),
      });

      if (res.ok) {
        toast.success(`Appointment marked as ${status}`);
        setAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status } : a))
        );
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Error updating status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const totalCount = appointments.length;
  const virtualCount = appointments.filter((a) => a.consultationType === "virtual" && a.status !== "cancelled").length;
  const directCount = appointments.filter((a) => a.consultationType === "direct" && a.status !== "cancelled").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  const filtered = appointments.filter((a) => {
    const matchesType = filterType === "all" || a.consultationType === filterType;
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      a.patientName.toLowerCase().includes(query) ||
      a.patientEmail.toLowerCase().includes(query) ||
      (a.decryptedNotes && a.decryptedNotes.toLowerCase().includes(query));

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Provider Navigation Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {currentDoctor?.avatar_url && (
              <img
                src={currentDoctor.avatar_url}
                alt={currentDoctor.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Stethoscope className="w-3 h-3" />
                  Clinician Dashboard
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {currentDoctor?.clinicRoom}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {currentDoctor?.name || "Attending Physician"}
              </h1>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {currentDoctor?.specialty}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{currentDoctor?.clinicRoom || "Clinic Examination Wing"}</span>
            </div>

            <button
              type="button"
              onClick={() => loadDoctorAppointments()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Schedule"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Google Calendar & Meet Integration Status Banner */}
        {!googleCalendarConnected ? (
          <div className="bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Google Calendar & Meet Integration
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                    Action Recommended
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Authorize your Google account to automatically generate real, verified Google Meet rooms for telehealth consultations.
                </p>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 text-center shadow-xs inline-flex items-center justify-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              Connect Google Calendar
            </a>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">Google Meet Integration Active</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                — Real Google Meet video consultation links are generated automatically upon booking.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              Live & Verified
            </span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Bookings</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <Video className="w-3.5 h-3.5" />
              <span>Virtual Telehealth</span>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{virtualCount}</p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Direct In-Person</span>
            </div>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{directCount}</p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">Pending Review</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
          </div>
        </div>

        {/* Controls: Search & Mode Filter Tabs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, email, or symptoms..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Consultation Mode Filter Tabs */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Modes
              </button>
              <button
                type="button"
                onClick={() => setFilterType("virtual")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterType === "virtual"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Video className="w-3 h-3" />
                Virtual
              </button>
              <button
                type="button"
                onClick={() => setFilterType("direct")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterType === "direct"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MapPin className="w-3 h-3" />
                Direct In-Person
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending Acceptance</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointment Cards List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-emerald-600 gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-semibold">Loading patient consultations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Appointments Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterType !== "all" || filterStatus !== "all"
                ? "No consultations matched your filters. Try clearing your search parameters."
                : `No patient appointments currently booked with ${currentDoctor?.name}.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((appt) => {
              const isVirtual = appt.consultationType === "virtual";
              const isCancelled = appt.status === "cancelled";
              const isCompleted = appt.status === "completed";
              const isPending = appt.status === "pending";

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
                      : isLiveNow && !isCompleted
                      ? "border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md"
                      : isPending
                      ? "border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/40"
                      : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/40"
                  }`}
                >
                  {/* Card Header: Patient info + Mode & Status badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {appt.patientName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                            isVirtual
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                          }`}
                        >
                          {isVirtual ? (
                            <>
                              <Video className="w-3 h-3" />
                              Virtual Meet
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3" />
                              Direct In-Person
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{appt.patientEmail}</p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isCancelled
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : isCompleted
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : isPending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  {/* Scheduled Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{formatAppointmentTime(appt.start_time)}</span>
                      </div>
                      {isLiveNow && !isCompleted && !isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Live Call Active
                        </span>
                      )}
                    </div>

                    {!isVirtual && (
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>Clinic Room: {appt.clinicRoom}</span>
                      </div>
                    )}

                    {appt.decryptedNotes && (
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          Patient Intake Symptoms:
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 italic line-clamp-3">
                          &ldquo;{appt.decryptedNotes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Doctor Action Controls */}
                  {!isCancelled && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {/* Accept Consultation Button (if pending) */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleAcceptAppointment(appt.id)}
                          disabled={actionLoadingId === appt.id}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          {actionLoadingId === appt.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Accept Appointment
                        </button>
                      )}

                      {/* Google Meet Link (for virtual) */}
                      {isVirtual && appt.meet_link && !isCompleted && (
                        <a
                          href={appt.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            isLiveNow
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500 ring-offset-2 animate-pulse"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          {isLiveNow ? "🔴 Launch Live Google Meet" : "Join Google Meet"}
                        </a>
                      )}

                      {/* Complete Consultation Button */}
                      {!isCompleted && !isPending && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                          disabled={actionLoadingId === appt.id}
                          className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Mark Completed
                        </button>
                      )}

                      {/* Reschedule Button */}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => setReschedulingAppointment(appt)}
                          className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          Reschedule
                        </button>
                      )}

                      {/* Cancel Consultation */}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                          disabled={actionLoadingId === appt.id}
                          className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
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
