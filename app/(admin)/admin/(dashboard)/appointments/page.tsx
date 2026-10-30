"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  XCircle,
  Video,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatAppointmentTime } from "@/lib/timezone";
import { toast } from "sonner";

interface AdminAppointment {
  id: string;
  doctor_name: string;
  doctor_specialty: string;
  start_time: string;
  end_time: string;
  status: string;
  meet_link?: string;
  patient_notes?: string;
  user_id: string;
  profiles?: { full_name?: string; email?: string };
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAllAppointments = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      let appts: any[] = [];

      const { data, error } = await supabase
        .from("appointments")
        .select("*, profiles!appointments_user_id_fkey(full_name, email)")
        .order("start_time", { ascending: false });

      if (!error && data) {
        appts = data;
      } else {
        const { data: rawData, error: rawErr } = await supabase
          .from("appointments")
          .select("*")
          .order("start_time", { ascending: false });

        if (!rawErr && rawData) {
          const userIds = Array.from(new Set(rawData.map((a: any) => a.user_id).filter(Boolean)));
          const profileMap: Record<string, { full_name?: string; email?: string }> = {};

          if (userIds.length > 0) {
            try {
              const { data: profs } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

              if (profs) {
                for (const p of profs) {
                  profileMap[p.id] = { full_name: p.full_name, email: p.email };
                }
              }
            } catch {}
          }

          appts = rawData.map((a: any) => ({
            ...a,
            profiles: profileMap[a.user_id] || null,
          }));
        }
      }

      setAppointments(appts);
    } catch (e) {
      console.warn("Failed to load appointments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAppointments();
  }, []);

  const handleOverrideCancel = async (id: string) => {
    if (!confirm("Administrative Override: Cancel this consultation and free Google Calendar slot?")) {
      return;
    }

    try {
      const res = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });

      if (res.ok) {
        toast.success("Consultation cancelled by admin override");
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
        );
      } else {
        toast.error("Failed to cancel appointment");
      }
    } catch {
      toast.error("Cancellation error");
    }
  };

  const filtered = appointments.filter((a) => {
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      a.doctor_name.toLowerCase().includes(query) ||
      (a.profiles?.full_name && a.profiles.full_name.toLowerCase().includes(query)) ||
      (a.profiles?.email && a.profiles.email.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          System-Wide Appointment Supervision
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supervise virtual consultations across all physicians with cancellation overrides
        </p>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, email, or physician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-emerald-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No appointments found matching your criteria.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Physician</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Video Link</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {appt.profiles?.full_name || "Patient"}
                      </p>
                      <p className="text-[11px] text-slate-500">{appt.profiles?.email || "N/A"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {appt.doctor_name}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {appt.doctor_specialty}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {formatAppointmentTime(appt.start_time)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          appt.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {appt.meet_link ? (
                        <a
                          href={appt.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Video className="w-3.5 h-3.5" /> Meet Link
                        </a>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {appt.status === "confirmed" && (
                        <button
                          type="button"
                          onClick={() => handleOverrideCancel(appt.id)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-semibold"
                        >
                          Override Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
