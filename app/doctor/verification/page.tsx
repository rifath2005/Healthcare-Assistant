"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Stethoscope,
  Send,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface VerificationState {
  id: string;
  name: string;
  specialty: string;
  license_number: string;
  qualification_proof: string;
  verification_status: "pending" | "approved" | "rejected";
  is_approved: boolean;
  rejection_reason?: string | null;
}

export default function DoctorVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<VerificationState | null>(null);

  // Form fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [qualificationProof, setQualificationProof] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerificationStatus() {
      try {
        setLoading(true);
        const res = await fetch("/api/doctor/verification");
        if (res.status === 401) {
          router.replace("/doctor/login");
          return;
        }

        const data = await res.json();
        if (data.verification) {
          setVerification(data.verification);
          setLicenseNumber(data.verification.license_number || "");
          setQualificationProof(data.verification.qualification_proof || "");
        }
      } catch (err) {
        console.error("Failed to load verification status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadVerificationStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!licenseNumber.trim()) {
      setErrorMsg("Please enter your valid medical license number.");
      return;
    }

    if (!qualificationProof.trim()) {
      setErrorMsg("Please provide your proof of qualification (license, certificate, or credential link).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/doctor/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_number: licenseNumber.trim(),
          qualification_proof: qualificationProof.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit qualification proof.");
      }

      toast.success("Proof of qualification submitted for admin review!");
      if (data.verification) {
        setVerification(data.verification);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed. Please try again.");
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const isApproved = verification?.is_approved && verification?.verification_status === "approved";
  const isPending = verification?.verification_status === "pending";
  const isRejected = verification?.verification_status === "rejected";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/doctor/appointments"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clinician Schedule
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Healthcare Provider Credentialing</span>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isApproved
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : isPending
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isPending ? (
                <Clock className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Doctor Verification &amp; Credentialing
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : isPending
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {isApproved
                    ? "Verified & Approved"
                    : isPending
                    ? "Pending Admin Review"
                    : "Verification Required / Rejected"}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isApproved
                  ? "Your credentials have been reviewed and approved by an administrator. Your profile is active and eligible for patient recommendations and appointments."
                  : isPending
                  ? "Your proof of qualification has been submitted and is currently being reviewed by an administrator. Doctors without approved status cannot be shown or recommended to patients."
                  : "Doctors must submit proof of medical qualification before appearing in the system. An administrator will review your documents for approval."}
              </p>

              {isRejected && verification?.rejection_reason && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
                  <span className="font-bold">Rejection Note: </span>
                  {verification.rejection_reason}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Credential Submission Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Submit Proof of Qualification
              </h2>
              <p className="text-xs text-slate-500">
                Enter your state license number and certificate document URL or identifier for admin verification.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Physician Full Name &amp; Specialty
              </label>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
                {verification?.name || "Attending Physician"} — {verification?.specialty || "General Medicine"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="license_number"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Medical License Number <span className="text-red-500">*</span>
              </label>
              <input
                id="license_number"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. MD-LIC-2024-8841"
                required
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Official medical license registration number issued by your state medical licensing authority.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="qualification_proof"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Proof of Qualification (License / Certificate Document or Reference) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="qualification_proof"
                rows={3}
                value={qualificationProof}
                onChange={(e) => setQualificationProof(e.target.value)}
                placeholder="e.g. State Medical Board Verification Ref: #99412 or verified diploma URL / license registry document"
                required
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Document URL, medical board registry link, or verification identifier submitted for administrative review.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Link
                href="/doctor/appointments"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit for Admin Review
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
