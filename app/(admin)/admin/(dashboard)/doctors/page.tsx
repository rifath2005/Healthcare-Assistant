"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Stethoscope, Loader2, Save, X, KeyRound, Copy, Check } from "lucide-react";
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

interface DoctorCredentials {
  email: string;
  clinicalCode: string;
  password: string;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<DoctorCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      const res = await fetch("/api/admin/doctors");
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
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
      if (editingDoctor) {
        const res = await fetch("/api/admin/doctors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDoctor.id,
            name,
            specialty,
            calendar_id: calendarId,
            bio,
            avatar_url: avatarUrl,
            is_active: isActive,
            working_hours: parsedHours,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update doctor");
        toast.success("Physician updated successfully");
      } else {
        const res = await fetch("/api/admin/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            specialty,
            calendar_id: calendarId,
            bio,
            avatar_url: avatarUrl,
            is_active: isActive,
            working_hours: parsedHours,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add doctor");

        toast.success("Physician registered successfully!");
        if (data.credentials) {
          setCreatedCredentials(data.credentials);
        }
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
      const res = await fetch(`/api/admin/doctors?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      toast.success("Physician deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete physician");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Physicians &amp; Specialists Directory
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
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            No physicians registered
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click &quot;Add Physician&quot; above to register specialists available for booking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => {
            const loginEmail = `${doc.name.toLowerCase().replace(/[^a-z]/g, "")}@healthcare.local`;
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        doc.avatar_url ||
                        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300"
                      }
                      alt={doc.name}
                      width={44}
                      height={44}
                      unoptimized
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {doc.specialty}
                      </p>
                    </div>
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

                {/* Login Credentials Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-emerald-600" /> Provider Portal Login:
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      PIN: Doctor@2026
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate">
                    Login ID: {loginEmail}
                  </div>
                </div>

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
            );
          })}
        </div>
      )}

      {/* New Credentials Modal (Shown after adding a physician) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setCreatedCredentials(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <h2 className="text-base font-bold">Physician Registered Successfully!</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Share these credentials with the physician to allow them to access the Clinician Portal at <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/doctor/login</code>:
            </p>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span>Login Email / ID:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdCredentials.email, "Email")}
                  className="flex items-center gap-1 font-bold text-slate-900 dark:text-white hover:text-emerald-600"
                >
                  {createdCredentials.email}
                  {copiedField === "Email" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Clinical Code:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdCredentials.clinicalCode, "Code")}
                  className="flex items-center gap-1 font-bold text-slate-900 dark:text-white hover:text-emerald-600"
                >
                  {createdCredentials.clinicalCode}
                  {copiedField === "Code" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Security PIN:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Done &amp; Return to Directory
            </button>
          </div>
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
                  placeholder="Internal Medicine / Cardiology / Dermatology"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Photo Avatar URL (Optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
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
                  placeholder="primary"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Keep as &quot;primary&quot; to use the clinic&apos;s connected Google Calendar.
                </p>
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
                  Physician is Active &amp; Discoverable for Bookings
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
