import { NextResponse } from "next/server";
import { getVerifiedApprovedDoctorsForPatients } from "@/lib/doctorRegistry";
import { validateDoctorApprovalGate } from "@/lib/validationArchitecture";

export const runtime = "nodejs";

/**
 * Public Patient Doctors Directory Endpoint
 *
 * Implements Requirement 3 & 4:
 * "Doctors without an approved status must not be shown to patients or recommended to them.
 * Do not store or display incomplete doctor details.
 * Doctor validation must happen before any doctor is suggested to a patient."
 */
export async function GET() {
  try {
    const verifiedDoctors = await getVerifiedApprovedDoctorsForPatients();

    // Secondary strict gate verification
    const filteredVerified = verifiedDoctors.filter((doc) => {
      const gate = validateDoctorApprovalGate({
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        license_number: doc.license_number,
        qualification_proof: doc.qualification_proof,
        verification_status: doc.verification_status,
        is_approved: doc.is_approved,
        is_active: doc.is_active,
      });
      return gate.isApproved;
    });

    return NextResponse.json({ doctors: filteredVerified });
  } catch (err) {
    console.warn("Public doctors GET error:", err);
    return NextResponse.json({ doctors: [] });
  }
}
