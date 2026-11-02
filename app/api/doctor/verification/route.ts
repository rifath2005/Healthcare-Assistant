import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";

/**
 * Doctor Portal Qualification Submission Endpoint
 *
 * Implements Requirement 3:
 * "The doctor portal must require the doctor to submit their proof of qualification
 * (license, certificate, or equivalent documents). An admin must review those documents
 * and approve or reject each doctor. Doctors without an approved status must not be shown
 * to patients or recommended to them. Do not store or display incomplete doctor details."
 */

export async function GET(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);
    if (!doctor) {
      return NextResponse.json(
        { error: "Unauthorized: Clinician authentication required." },
        { status: 401 }
      );
    }

    // Attempt DB lookup
    let dbDoc: any = null;
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("doctors")
        .select("id, name, specialty, license_number, qualification_proof, verification_status, is_approved, rejection_reason")
        .eq("id", doctor.id)
        .single();
      dbDoc = data;
    } catch {
      // Continue to fallback
    }

    const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === doctor.id);

    const verification = {
      id: doctor.id,
      name: dbDoc?.name || doctor.name || clinicDoc?.name || "Attending Physician",
      specialty: dbDoc?.specialty || doctor.specialty || clinicDoc?.specialty || "General Medicine",
      license_number: dbDoc?.license_number || clinicDoc?.license_number || "",
      qualification_proof: dbDoc?.qualification_proof || clinicDoc?.qualification_proof || "",
      verification_status: dbDoc?.verification_status || clinicDoc?.verification_status || "pending",
      is_approved: dbDoc?.is_approved ?? clinicDoc?.is_approved ?? false,
      rejection_reason: dbDoc?.rejection_reason || clinicDoc?.rejection_reason || null,
    };

    return NextResponse.json({ success: true, verification });
  } catch (err: any) {
    console.error("GET /api/doctor/verification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);
    if (!doctor) {
      return NextResponse.json(
        { error: "Unauthorized: Clinician authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { license_number, qualification_proof } = body;

    // Do not store or display incomplete doctor details: Proof of qualification must be present
    if (!license_number || typeof license_number !== "string" || !license_number.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Medical license number is required." },
        { status: 400 }
      );
    }

    if (!qualification_proof || typeof qualification_proof !== "string" || !qualification_proof.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Proof of qualification (license, certificate, or credential link) is required." },
        { status: 400 }
      );
    }

    const trimmedLicense = license_number.trim();
    const trimmedProof = qualification_proof.trim();

    // Set to pending review upon submission - requires admin review to be approved
    const verificationPayload = {
      license_number: trimmedLicense,
      qualification_proof: trimmedProof,
      verification_status: "pending" as const,
      is_approved: false,
      rejection_reason: null,
    };

    // Update in-memory CLINIC_DOCTORS if present
    const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === doctor.id);
    if (clinicDoc) {
      clinicDoc.license_number = trimmedLicense;
      clinicDoc.qualification_proof = trimmedProof;
      clinicDoc.verification_status = "pending";
      clinicDoc.is_approved = false;
      clinicDoc.rejection_reason = undefined;
    }

    // Persist to Supabase if available
    try {
      const supabase = createAdminClient();
      await supabase
        .from("doctors")
        .update(verificationPayload)
        .eq("id", doctor.id);
    } catch (dbErr) {
      console.warn("DB update failed (using in-memory fallback):", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Proof of qualification submitted successfully. Your credentials are now under administrative review.",
      verification: {
        id: doctor.id,
        ...verificationPayload,
      },
    });
  } catch (err: any) {
    console.error("POST /api/doctor/verification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
