import { NextRequest, NextResponse } from "next/server";
import { validateEmailGate } from "@/lib/validationArchitecture";
import { registerDoctorApplication } from "@/lib/doctorRegistry";

export const runtime = "nodejs";

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

    const parsedAdvantages: string[] = Array.isArray(advantages)
      ? advantages.map((a: any) => String(a).trim()).filter(Boolean)
      : typeof advantages === "string" && advantages.trim()
      ? advantages.split("\n").map((s) => s.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
      : [];

    // Register into persistent doctor registry (persists across processes and syncs to DB)
    const newDoc = await registerDoctorApplication({
      name: name.trim(),
      email: emailGate.normalizedEmail,
      specialty: specialty.trim(),
      license_number: license_number.trim(),
      qualification_proof: qualification_proof.trim(),
      specialization_study: typeof specialization_study === "string" ? specialization_study.trim() : undefined,
      advantages: parsedAdvantages.length > 0 ? parsedAdvantages : undefined,
      bio: typeof bio === "string" ? bio.trim() : undefined,
      clinicRoom: typeof clinicRoom === "string" ? clinicRoom.trim() : undefined,
      avatar_url: typeof avatar_url === "string" ? avatar_url.trim() : undefined,
      working_hours,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Doctor listing request submitted successfully. A clinic administrator will review your medical credentials and proof of qualification before listing.",
        doctor: {
          id: newDoc.id,
          name: newDoc.name,
          email: newDoc.email,
          specialty: newDoc.specialty,
          license_number: newDoc.license_number,
          qualification_proof: newDoc.qualification_proof,
          verification_status: newDoc.verification_status,
          is_approved: newDoc.is_approved,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/doctor/apply exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
