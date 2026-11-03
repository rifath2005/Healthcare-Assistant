"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Building,
  Send,
  GraduationCap,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function DoctorApplyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [qualificationProof, setQualificationProof] = useState("");
  const [specializationStudy, setSpecializationStudy] = useState("");
  const [advantages, setAdvantages] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend validation
    if (!name.trim()) {
      setErrorMsg("Physician full name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Valid physician work email is required.");
      return;
    }
    if (!specialty.trim()) {
      setErrorMsg("Medical specialty is required.");
      return;
    }
    if (!licenseNumber.trim()) {
      setErrorMsg("Medical license number is required for qualification verification.");
      return;
    }
    if (!qualificationProof.trim()) {
      setErrorMsg("Proof of qualification (license, certificate, or credential link) is required.");
      return;
    }

    try {
      setLoading(true);

      const parsedAdvantages = advantages
        .split("\n")
        .map((s) => s.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);

      const res = await fetch("/api/doctor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          specialty: specialty.trim(),
          license_number: licenseNumber.trim(),
          qualification_proof: qualificationProof.trim(),
          specialization_study: specializationStudy.trim() || undefined,
          advantages: parsedAdvantages.length > 0 ? parsedAdvantages : undefined,
          bio: bio.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit listing request.");
      }

      setSubmitted(true);
      toast.success("Listing application submitted for administrative review!");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during submission.");
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/doctor/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clinician Sign In
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Clinic Specialist Credentialing</span>
          </div>
        </div>

        {submitted ? (
          /* Submission Success State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Listing Request Submitted Successfully!
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>. Your medical credentials and proof of qualification have been forwarded to the clinic administrator for credential verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verification Gate: Clinical Compliance Notice</span>
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                In accordance with healthcare safety standards, doctors without an approved verification status must not be shown or recommended to patients. An administrator will review your medical license (<span className="font-mono font-semibold">{licenseNumber}</span>) and qualification documents before activating your directory listing.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/doctor/login"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
              >
                Return to Provider Portal
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Go to Public Home
              </Link>
            </div>
          </div>
        ) : (
          /* Application Form */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="inline-flex p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Apply for Doctor Listing &amp; Credential Verification
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Submit your practitioner details and proof of qualification for administrative review to join our clinic&apos;s verified specialist directory.
              </p>
            </div>

            {/* Credentialing Compliance Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed space-y-1">
                <p className="font-bold">Required Credential Verification Architecture:</p>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Doctors must submit proof of qualification (license, certificate, or board verification documents). A clinic administrator reviews each submission. Doctors without approved status will not be displayed or suggested to patients until formally verified.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Core Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Physician Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith, MD"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Professional Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jane.smith@healthcare.local"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Specialty */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Medical Specialty &amp; Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Orthopedic Surgery & Joint Reconstruction / Cardiology / Dermatology"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* License Number & Qualification Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Medical License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MD-LIC-2024-9182"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Official state medical board registration number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Proof of Qualification Document / Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={qualificationProof}
                    onChange={(e) => setQualificationProof(e.target.value)}
                    placeholder="e.g. State Registry Ref: #48192 or Diploma URL"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Document reference, registry link, or verification identifier.
                  </p>
                </div>
              </div>

              {/* Specialization Study */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Specialization Study, Fellowships &amp; Research</span>
                </label>
                <textarea
                  rows={2}
                  value={specializationStudy}
                  onChange={(e) => setSpecializationStudy(e.target.value)}
                  placeholder="e.g. American Board of Orthopaedic Surgery (ABOS) Certified with subspecialty fellowship in Adult Joint Reconstruction and knee cartilage preservation."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  Explains to patients why you were suggested based on your research and medical study background.
                </p>
              </div>

              {/* Clinical Advantages */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Key Clinical Strengths &amp; Advantages (One per line)</span>
                </label>
                <textarea
                  rows={3}
                  value={advantages}
                  onChange={(e) => setAdvantages(e.target.value)}
                  placeholder="Deep expertise in mechanical joint alignment and cartilage wear&#10;Interventional non-surgical and surgical evaluation&#10;Specialized in prolonged or chronic joint pain triage"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  If multiple specialists practice in your field, these advantages highlight your distinct clinical approach.
                </p>
              </div>

              {/* Clinical Bio */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Physician Bio &amp; Practice Overview
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief summary of your clinical experience and practice philosophy..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting for Administrative Review...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Request for Clinic Listing</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Protected Provider Submission &bull; Encrypted Credential Records</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
