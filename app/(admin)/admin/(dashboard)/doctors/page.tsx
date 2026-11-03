"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Stethoscope,
  Loader2,
  Save,
  X,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  FileCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  calendar_id: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  working_hours: Record<string, { start: string; end: string }>;
  license_number?: string;
  qualification_proof?: string;
  verification_status?: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  rejection_reason?: string;
  specialization_study?: string;
  advantages?: string[];
}

interface DoctorCredentials {
  email: string;
  clinicalCode: string;
  password: string;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<DoctorCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Healthcare Management Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [qualificationProof, setQualificationProof] = useState("");
  const [specializationStudy, setSpecializationStudy] = useState("");
  const [advantagesText, setAdvantagesText] = useState("");
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

  const loadDoctors = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch("/api/admin/doctors", { cache: "no-store" });
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
      }
    } catch (e) {
      console.warn("Failed to load doctors:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();

    // Auto-polling every 10 seconds so newly applied doctors appear automatically
    const timer = setInterval(() => {
      loadDoctors(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [loadDoctors]);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setName("");
    setSpecialty("");
    setCalendarId("primary");
    setBio("");
    setAvatarUrl("");
    setLicenseNumber("");
    setQualificationProof("");
    setSpecializationStudy("");
    setAdvantagesText("");
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
    setLicenseNumber(doc.license_number || "");
    setQualificationProof(doc.qualification_proof || "");
    setSpecializationStudy(doc.specialization_study || "");
    setAdvantagesText(doc.advantages ? doc.advantages.join("\n") : "");
    setIsActive(doc.is_active);
    setWorkingHoursJson(JSON.stringify(doc.working_hours, null, 2));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce completeness: Do not store incomplete details
    if (!name.trim() || !specialty.trim() || !licenseNumber.trim() || !qualificationProof.trim()) {
      toast.error("Incomplete details: Doctor name, specialty, license number, and qualification proof are required.");
      return;
    }

    let parsedHours;
    try {
      parsedHours = JSON.parse(workingHoursJson);
    } catch {
      toast.error("Invalid Working Hours JSON format");
      return;
    }

    const parsedAdvantages = advantagesText
      .split("\n")
      .map((s) => s.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);

    try {
      if (editingDoctor) {
        const res = await fetch("/api/admin/doctors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDoctor.id,
            name: name.trim(),
            specialty: specialty.trim(),
            calendar_id: calendarId,
            bio: bio.trim(),
            avatar_url: avatarUrl.trim(),
            license_number: licenseNumber.trim(),
            qualification_proof: qualificationProof.trim(),
            specialization_study: specializationStudy.trim() || undefined,
            advantages: parsedAdvantages.length > 0 ? parsedAdvantages : undefined,
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
            name: name.trim(),
            specialty: specialty.trim(),
            calendar_id: calendarId,
            bio: bio.trim(),
            avatar_url: avatarUrl.trim(),
            license_number: licenseNumber.trim(),
            qualification_proof: qualificationProof.trim(),
            specialization_study: specializationStudy.trim() || undefined,
            advantages: parsedAdvantages.length > 0 ? parsedAdvantages : undefined,
            verification_status: "approved",
            is_approved: true,
            is_active: isActive,
            working_hours: parsedHours,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add doctor");

        toast.success("Physician registered and verified successfully!");
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

  const handleReviewAction = async (id: string, action: "approve" | "reject") => {
    let rejectionReason = "";
    if (action === "reject") {
      const reason = window.prompt(
        "Enter administrative rejection reason (e.g. License unverified on medical board registry):",
        "Submitted qualification documents are invalid or unverifiable on state board registry."
      );
      if (reason === null) return; // cancelled
      rejectionReason = reason;
    }

    try {
      const res = await fetch("/api/admin/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          rejection_reason: rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} doctor`);

      toast.success(
        action === "approve"
          ? "Doctor approved! Physician is now verified and active for patient recommendations & booking."
          : "Doctor rejected. Practitioner is deactivated and hidden from patients."
      );
      loadDoctors();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} doctor`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this physician from the clinical directory?")) return;

    try {
      const res = await fetch(`/api/admin/doctors?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      toast.success("Physician deleted from directory");
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

  // Clinical Metrics
  const totalCount = doctors.length;
  const pendingCount = doctors.filter(
    (d) => d.verification_status === "pending" || (!d.is_approved && d.verification_status !== "rejected")
  ).length;
  const approvedCount = doctors.filter(
    (d) => d.verification_status === "approved" && d.is_approved === true && d.is_active !== false
  ).length;
  const rejectedCount = doctors.filter((d) => d.verification_status === "rejected").length;

  // Filtered List
  const filteredDoctors = doctors.filter((doc) => {
    const isApproved = doc.verification_status === "approved" && doc.is_approved && doc.is_active !== false;
    const isPending = doc.verification_status === "pending" || (!doc.is_approved && doc.verification_status !== "rejected");
    const isRejected = doc.verification_status === "rejected";

    if (statusFilter === "pending" && !isPending) return false;
    if (statusFilter === "approved" && !isApproved) return false;
    if (statusFilter === "rejected" && !isRejected) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchSpecialty = doc.specialty.toLowerCase().includes(q);
      const matchLicense = doc.license_number?.toLowerCase().includes(q);
      const matchProof = doc.qualification_proof?.toLowerCase().includes(q);
      const matchBio = doc.bio?.toLowerCase().includes(q);
      return matchName || matchSpecialty || matchLicense || matchProof || matchBio;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Healthcare Administration
            </span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 animate-pulse font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing Registry...
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Clinical Specialist Credentialing &amp; Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verify medical licenses, inspect qualification proofs, and govern patient directory visibility
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDoctors()}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Physician
          </button>
        </div>
      </div>

      {/* Clinical KPI Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === "all"
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Practitioners</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Roster Directory</p>
        </div>

        <div
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === "pending"
              ? "bg-amber-500/10 border-amber-500/60 shadow-xs"
              : pendingCount > 0
              ? "bg-amber-500/5 border-amber-300 dark:border-amber-700/60 hover:border-amber-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pending Review
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white animate-pulse">
                Action Needed
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1.5">{pendingCount}</p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">Awaiting Credential Check</p>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === "approved"
              ? "bg-emerald-500/10 border-emerald-500/60 shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified &amp; Active
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              User Visible
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5">{approvedCount}</p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Matched &amp; Bookable</p>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === "rejected"
              ? "bg-red-500/10 border-red-500/60 shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Rejected / Revoked
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              Blocked
            </span>
          </div>
          <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1.5">{rejectedCount}</p>
          <p className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5">Hidden from Patients</p>
        </div>
      </div>

      {/* Priority Action Alert Banner for Pending Requests */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Physician Listing Requests Awaiting Review ({pendingCount})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold uppercase">
                  Action Required
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Doctors without approved status must NOT be shown to patients or recommended to them. Review their submitted state medical license and proof of qualification documents below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs transition-colors"
          >
            Filter Pending Requests ({pendingCount})
          </button>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Clinicians ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-amber-700 dark:text-amber-400 hover:text-amber-800"
              }`}
            >
              <Clock className="w-3 h-3" />
              Pending Review ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "approved"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Verified &amp; Active ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "rejected"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "text-red-600 dark:text-red-400 hover:text-red-700"
              }`}
            >
              <XCircle className="w-3 h-3" />
              Rejected ({rejectedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by physician name, specialty, license number, or qualification proof..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Physician Directory Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-emerald-600 gap-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-bold">Loading Clinical Directory...</span>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            {searchQuery || statusFilter !== "all" ? "No Matching Physicians Found" : "No physicians registered"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusFilter === "pending"
              ? "All physician listing applications have been reviewed. There are no pending requests awaiting verification."
              : searchQuery
              ? "No clinical profiles matched your search parameters. Try clearing your search query."
              : "Click 'Add Physician' above or have physicians apply at /doctor/apply to register specialist listings."}
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => {
            const loginEmail = doc.email || `${doc.name.toLowerCase().replace(/[^a-z]/g, "")}@healthcare.local`;
            const isApproved = doc.is_approved && doc.verification_status === "approved" && doc.is_active !== false;
            const isPending = doc.verification_status === "pending" || (!doc.is_approved && doc.verification_status !== "rejected");
            const isRejected = doc.verification_status === "rejected";

            return (
              <div
                key={doc.id}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs transition-all space-y-3.5 ${
                  isPending
                    ? "border-amber-400 dark:border-amber-700/80 ring-2 ring-amber-400/20"
                    : isRejected
                    ? "border-red-200 dark:border-red-900/60 opacity-80"
                    : "border-slate-200 dark:border-slate-800 hover:shadow-md"
                }`}
              >
                {/* Practitioner Card Header */}
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

                  {/* Verification Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : isPending
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : isPending ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {isApproved
                      ? "Approved & Active"
                      : isPending
                      ? "Pending Review"
                      : "Rejected / Inactive"}
                  </span>
                </div>

                {doc.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {doc.bio}
                  </p>
                )}

                {/* Proof of Qualification Details Box */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Proof of Qualification:</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {isApproved ? "Verified by Admin" : isPending ? "Review Required" : "Unverified"}
                    </span>
                  </div>

                  <div className="text-slate-600 dark:text-slate-400 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">License: </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {doc.license_number || "Not provided"}
                      </span>
                    </div>
                    {doc.license_number && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(doc.license_number!, "License")}
                        className="text-[10px] text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                        title="Copy license number"
                      >
                        {copiedField === "License" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Credential Proof: </span>
                    <span className="break-all">{doc.qualification_proof || "Not submitted"}</span>
                  </div>

                  {doc.specialization_study && (
                    <div className="text-slate-600 dark:text-slate-400 text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Specialization &amp; Studies: </span>
                      <span>{doc.specialization_study}</span>
                    </div>
                  )}

                  {doc.advantages && doc.advantages.length > 0 && (
                    <div className="text-slate-600 dark:text-slate-400 text-[10px] pt-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Key Advantages: </span>
                      <span>{doc.advantages.join(" • ")}</span>
                    </div>
                  )}

                  {isRejected && doc.rejection_reason && (
                    <div className="text-red-600 dark:text-red-400 text-[10px] pt-1.5 border-t border-red-200 dark:border-red-900/40">
                      <span className="font-bold">Rejection Reason: </span>
                      {doc.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Login Credentials Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-emerald-600" /> Portal Login:
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      PIN: Doctor@2026
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate">
                    Login ID: {loginEmail}
                  </div>
                </div>

                {/* Admin Verification Review Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {!isApproved ? (
                    <button
                      type="button"
                      onClick={() => handleReviewAction(doc.id, "approve")}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve Credentials
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReviewAction(doc.id, "reject")}
                      className="py-1.5 px-3 rounded-lg border border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-semibold transition-colors"
                      title="Revoke / Suspend Verification"
                    >
                      Suspend
                    </button>
                  )}

                  {!isRejected && !isApproved && (
                    <button
                      type="button"
                      onClick={() => handleReviewAction(doc.id, "reject")}
                      className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject Application
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(doc)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Edit profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete physician from directory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Credentials Modal */}
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
              {editingDoctor ? "Edit Physician Profile & Credentials" : "Register New Physician"}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold pb-1">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
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
                <label className="block font-semibold pb-1">
                  Medical Specialty <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Orthopedics / Cardiology / Dermatology"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">
                  Medical License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MD-LIC-2024-9912"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">
                  Proof of Qualification (License/Certificate document) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={qualificationProof}
                  onChange={(e) => setQualificationProof(e.target.value)}
                  placeholder="e.g. State Medical Board Certified License & ABIM Fellowship Certificate"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Specialization Studies &amp; Research</label>
                <textarea
                  rows={2}
                  value={specializationStudy}
                  onChange={(e) => setSpecializationStudy(e.target.value)}
                  placeholder="e.g. ABOS Board-Certified in Orthopedic Surgery with Adult Reconstruction Fellowship."
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold pb-1">Key Clinical Advantages (One per line)</label>
                <textarea
                  rows={2}
                  value={advantagesText}
                  onChange={(e) => setAdvantagesText(e.target.value)}
                  placeholder="Specialized in non-surgical joint rehabilitation&#10;Comprehensive differential diagnostics"
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
              </div>

              <div>
                <label className="block font-semibold pb-1">Working Hours (JSON)</label>
                <textarea
                  rows={4}
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
