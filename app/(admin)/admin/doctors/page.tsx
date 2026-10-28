"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Stethoscope, Loader2, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  calendar_id: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  working_hours: Record<string, { start: string; end: string }>;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [workingHoursJson, setWorkingHoursJson] = useState(
    JSON.stringify(
      {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "16:00" },
      },
      null,
      2
    )
  );

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setDoctors(data);
      }
    } catch (e) {
      console.warn("Failed to load doctors:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setName("");
    setSpecialty("");
    setCalendarId("primary");
    setBio("");
    setAvatarUrl("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialty(doc.specialty);
    setCalendarId(doc.calendar_id);
    setBio(doc.bio || "");
    setAvatarUrl(doc.avatar_url || "");
    setIsActive(doc.is_active);
    setWorkingHoursJson(JSON.stringify(doc.working_hours, null, 2));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedHours;
    try {
      parsedHours = JSON.parse(workingHoursJson);
    } catch {
      toast.error("Invalid Working Hours JSON format");
      return;
    }

    try {
      const supabase = createClient();

      if (editingDoctor) {
        const { error } = await supabase
          .from("doctors")
          .update({
            name,
            specialty,
            calendar_id: calendarId,
            bio,
            avatar_url: avatarUrl,
            is_active: isActive,
            working_hours: parsedHours,
          })
          .eq("id", editingDoctor.id);

        if (error) throw error;
        toast.success("Physician updated successfully");
      } else {
        const { error } = await supabase.from("doctors").insert({
          name,
          specialty,
          calendar_id: calendarId,
          bio,
          avatar_url: avatarUrl,
          is_active: isActive,
          working_hours: parsedHours,
        });

        if (error) throw error;
        toast.success("Physician added successfully");
      }

      setIsModalOpen(false);
      loadDoctors();
    } catch (err: any) {
      console.error("Save doctor error:", err);
      toast.error(err.message || "Failed to save physician profile");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this physician?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
      setDoctors(doctors.filter((d) => d.id !== id));
      toast.success("Physician deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete physician");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Physicians & Specialists Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure physician profiles, calendar delegation IDs, and working hours
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Physician
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-emerald-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No physicians registered in the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {doc.specialty}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    doc.is_active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {doc.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {doc.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {doc.bio}
                </p>
              )}

              <div className="text-[11px] text-slate-500 font-mono">
                Calendar ID: {doc.calendar_id}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => openEditModal(doc)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Delete physician"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingDoctor ? "Edit Physician Profile" : "Register New Physician"}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold pb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith, MD"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Medical Specialty</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Internal Medicine / Cardiology"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Google Calendar ID</label>
                <input
                  type="text"
                  required
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  placeholder="primary or doctor@clinic.com"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Clinical Biography</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Board-certified clinician with 10+ years experience..."
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Working Hours (JSON)</label>
                <textarea
                  rows={5}
                  value={workingHoursJson}
                  onChange={(e) => setWorkingHoursJson(e.target.value)}
                  className="w-full font-mono text-[11px] px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="activeCheck" className="font-semibold select-none">
                  Physician is Active & Discoverable for Bookings
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Physician Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
