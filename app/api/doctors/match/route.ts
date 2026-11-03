import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { getVerifiedApprovedDoctorsForPatients } from "@/lib/doctorRegistry";
import {
  validatePatientProfileGate,
  validateDoctorApprovalGate,
  matchDoctorToPatient,
  type PatientProfileData,
  type DoctorVerificationData,
} from "@/lib/validationArchitecture";

export const runtime = "nodejs";

/**
 * Doctor Suggestion and Matching API
 *
 * Implements Requirement 4:
 * "Doctor validation must happen before any doctor is suggested to a patient.
 *  Doctor suggestions must depend on the patient's profile data being present and valid.
 *  Patients must not be matched to doctors without verified credentials or without
 *  enough information from the patient."
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required to request doctor suggestions." },
        { status: 401 }
      );
    }

    // 1. Fetch patient profile
    let patientProfile: PatientProfileData | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, health_issues, age, gender, medical_history, is_profile_complete")
        .eq("id", user.id)
        .single();

      if (data) {
        patientProfile = data;
      }
    } catch {
      // fallback
    }

    // Also check session metadata if DB profile didn't populate
    if (!patientProfile || !patientProfile.health_issues) {
      const meta = user.user_metadata || {};
      patientProfile = {
        id: user.id,
        email: user.email,
        full_name: meta.full_name,
        health_issues: meta.health_issues,
        age: meta.age,
        gender: meta.gender,
        medical_history: meta.medical_history,
        is_profile_complete: meta.is_profile_complete,
      };
    }

    // 2. Validate patient profile gate: suggestions depend on profile data being present and valid
    const profileGate = validatePatientProfileGate(patientProfile);
    if (!profileGate.isComplete) {
      return NextResponse.json(
        {
          error: "Doctor suggestions depend on patient profile data being present and valid. Patients must not be matched to doctors without enough information.",
          missingFields: profileGate.missingFields,
          requiresProfileCompletion: true,
        },
        { status: 400 }
      );
    }

    // 3. Fetch strictly verified & approved doctors
    const candidateDoctors = await getVerifiedApprovedDoctorsForPatients();

    // Doctor validation happens before any doctor is suggested
    const matchResult = matchDoctorToPatient(patientProfile, candidateDoctors as any);

    if (!matchResult.success) {
      return NextResponse.json(
        { error: matchResult.error || "Unable to match a verified physician." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      topRecommendationSummary: matchResult.topRecommendationSummary,
      suggestedDoctor: matchResult.matchedDoctor,
      suggestedDoctors: matchResult.matchedDoctors,
      eligibleVerifiedDoctors: matchResult.eligibleDoctors,
      patientContext: {
        statedHealthIssues: patientProfile.health_issues,
        age: patientProfile.age,
      },
    });
  } catch (err: any) {
    console.error("GET /api/doctors/match error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { patientProfile } = body;

    // Doctor suggestions must depend on patient's profile data being present and valid
    const profileGate = validatePatientProfileGate(patientProfile);
    if (!profileGate.isComplete) {
      return NextResponse.json(
        {
          error: "Doctor suggestions depend on patient profile data being present and valid. Patients must not be matched without enough information.",
          missingFields: profileGate.missingFields,
        },
        { status: 400 }
      );
    }

    // Fetch strictly verified doctors
    const verifiedDoctors = await getVerifiedApprovedDoctorsForPatients();
    const matchResult = matchDoctorToPatient(patientProfile, verifiedDoctors as any);
    if (!matchResult.success) {
      return NextResponse.json(
        { error: matchResult.error || "Unable to match a verified physician." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      topRecommendationSummary: matchResult.topRecommendationSummary,
      suggestedDoctor: matchResult.matchedDoctor,
      suggestedDoctors: matchResult.matchedDoctors,
      eligibleVerifiedDoctors: matchResult.eligibleDoctors,
    });
  } catch (err: any) {
    console.error("POST /api/doctors/match error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
