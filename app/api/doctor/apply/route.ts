import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";
import { validateEmailGate } from "@/lib/validationArchitecture";

export const runtime = "nodejs";

const DEFAULT_WORKING_HOURS = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "16:00" },
};

/**
 * Public Doctor Listing Application Endpoint
 *
 * Implements Physician Listing Request:
 * Allows prospective or existing physicians to submit a listing request
 * with proof of qualification (medical license & credential documentation)
 * for administrative review.
 *
 * Requirement 3:
 * "Doctors must not appear as valid or usable in the system without verification.
 * The doctor portal must require the doctor to submit their proof of qualification
 * (license, certificate, or equivalent documents). An admin must review those documents
 * and approve or reject each doctor. Doctors without an approved status must not be shown
 * to patients or recommended to them. Do not store or display incomplete doctor details."
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      email,
      specialty,
      license_number,
      qualification_proof,
      specialization_study,
      advantages,
      bio,
      clinicRoom,
      avatar_url,
      working_hours,
    } = body;

    // 1. Strict Completeness Validations: "Do not store or display incomplete doctor details"
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Physician full name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Physician work email is required." },
        { status: 400 }
      );
    }

    const emailGate = validateEmailGate(email);
    if (!emailGate.isValid || !emailGate.normalizedEmail) {
      return NextResponse.json(
        { error: emailGate.error || "Please enter a valid, correctly formatted email address." },
        { status: 400 }
      );
    }

    if (!specialty || typeof specialty !== "string" || !specialty.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Medical specialty is required." },
        { status: 400 }
      );
    }

    if (!license_number || typeof license_number !== "string" || !license_number.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Medical license number is required for verification." },
        { status: 400 }
      );
    }

    if (!qualification_proof || typeof qualification_proof !== "string" || !qualification_proof.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Proof of qualification (license, certificate, or credential link) is required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const normalizedEmail = emailGate.normalizedEmail;
    const trimmedSpecialty = specialty.trim();
    const trimmedLicense = license_number.trim();
    const trimmedProof = qualification_proof.trim();
    const trimmedStudy = typeof specialization_study === "string" ? specialization_study.trim() : "";
    const parsedAdvantages: string[] = Array.isArray(advantages)
      ? advantages.map((a: any) => String(a).trim()).filter(Boolean)
      : typeof advantages === "string" && advantages.trim()
      ? advantages.split("\n").map((s) => s.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
      : [];

    const defaultAvatar =
      typeof avatar_url === "string" && avatar_url.trim()
        ? avatar_url.trim()
        : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300";

    const lastName = trimmedName.split(" ").pop()?.replace(/[^a-zA-Z]/g, "").toUpperCase() || "DOC";
    const generatedId = `doc-req-${Date.now()}`;
    const clinicalCode = `DR-${lastName}-${generatedId.slice(-4)}`;

    // Set status to PENDING and NOT approved
    const doctorRecord: DoctorProfile = {
      id: generatedId,
      name: trimmedName,
      email: normalizedEmail,
      specialty: trimmedSpecialty,
      clinicRoom: clinicRoom?.trim() || "Room 101 - Clinical Consultation Suite",
      avatar_url: defaultAvatar,
      bio: bio?.trim() || `Physician specializing in ${trimmedSpecialty}.`,
      calendar_id: "primary",
      clinicalCode,
      license_number: trimmedLicense,
      qualification_proof: trimmedProof,
      verification_status: "pending",
      is_approved: false,
      is_active: false, // Inactive until admin approves
      working_hours: working_hours || DEFAULT_WORKING_HOURS,
      specialization_study: trimmedStudy || undefined,
      advantages: parsedAdvantages.length > 0 ? parsedAdvantages : undefined,
    };

    // Check if physician email already registered
    const existingIndex = CLINIC_DOCTORS.findIndex(
      (d) => d.email.toLowerCase() === normalizedEmail || d.license_number === trimmedLicense
    );

    if (existingIndex !== -1) {
      // Update existing record's verification submission
      CLINIC_DOCTORS[existingIndex].license_number = trimmedLicense;
      CLINIC_DOCTORS[existingIndex].qualification_proof = trimmedProof;
      CLINIC_DOCTORS[existingIndex].verification_status = "pending";
      CLINIC_DOCTORS[existingIndex].is_approved = false;
      CLINIC_DOCTORS[existingIndex].rejection_reason = undefined;
      if (trimmedStudy) CLINIC_DOCTORS[existingIndex].specialization_study = trimmedStudy;
      if (parsedAdvantages.length > 0) CLINIC_DOCTORS[existingIndex].advantages = parsedAdvantages;
    } else {
      CLINIC_DOCTORS.push(doctorRecord);
    }

    // Persist to Supabase if configured
    try {
      const supabase = createAdminClient();
      await supabase.from("doctors").upsert(
        {
          id: existingIndex !== -1 ? CLINIC_DOCTORS[existingIndex].id : generatedId,
          name: trimmedName,
          email: normalizedEmail,
          specialty: trimmedSpecialty,
          clinicRoom: doctorRecord.clinicRoom,
          avatar_url: defaultAvatar,
          bio: doctorRecord.bio,
          calendar_id: "primary",
          clinicalCode,
          license_number: trimmedLicense,
          qualification_proof: trimmedProof,
          verification_status: "pending",
          is_approved: false,
          is_active: false,
          working_hours: doctorRecord.working_hours,
          specialization_study: trimmedStudy || null,
          advantages: parsedAdvantages.length > 0 ? parsedAdvantages : null,
        },
        { onConflict: "email" }
      );
    } catch (dbErr) {
      console.warn("Supabase doctor listing request insert warning:", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Doctor listing request submitted successfully. A clinic administrator will review your medical credentials and proof of qualification before listing.",
        doctor: {
          id: existingIndex !== -1 ? CLINIC_DOCTORS[existingIndex].id : generatedId,
          name: trimmedName,
          email: normalizedEmail,
          specialty: trimmedSpecialty,
          license_number: trimmedLicense,
          qualification_proof: trimmedProof,
          verification_status: "pending",
          is_approved: false,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/doctor/apply exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
