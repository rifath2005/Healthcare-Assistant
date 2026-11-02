import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS, getApprovedDoctors } from "@/lib/doctors";
import { validateDoctorApprovalGate } from "@/lib/validationArchitecture";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: dbDoctors, error } = await supabase
      .from("doctors")
      .select("id, name, specialty, avatar_url, bio, working_hours, is_active, license_number, qualification_proof, verification_status, is_approved")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!error && dbDoctors && dbDoctors.length > 0) {
      // Doctor Verification Gate: Doctors without approved status must NOT be shown or recommended to patients.
      // Also filter out any doctors with incomplete details.
      const verifiedDoctors = dbDoctors.filter((doc) => {
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

      if (verifiedDoctors.length > 0) {
        return NextResponse.json({ doctors: verifiedDoctors });
      }
    }

    // Fallback to verified in-memory certified physicians
    const fallbackApproved = getApprovedDoctors();
    return NextResponse.json({ doctors: fallbackApproved });
  } catch (err) {
    console.warn("Public doctors GET fallback notice:", err);
    return NextResponse.json({ doctors: getApprovedDoctors() });
  }
}
