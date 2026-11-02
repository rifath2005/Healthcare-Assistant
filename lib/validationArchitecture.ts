/**
 * Validation Architecture for Healthcare Web Application
 *
 * Implements strict gating mechanisms:
 * 1. Email Validation Gate (Login Flow):
 *    - Validates email format before password input can be shown or submitted.
 * 2. Patient Profile Completion Gate (Mandatory Profile Flow):
 *    - Requires health issue description first, then remaining profile fields (age, etc.).
 *    - Gates access to the main and conversational pages.
 * 3. Doctor Credential Approval Gate (Doctor Portal & Admin Review):
 *    - Requires proof of qualification (license, certificate).
 *    - Gates visibility to patients until approved by an administrator.
 * 4. Doctor Matching & Suggestion Gate:
 *    - Doctor suggestions strictly depend on patient profile being present and valid,
 *      and only verified/approved doctors being suggested.
 */

import { emailSchema } from "@/lib/validations/auth";

export interface PatientProfileData {
  id?: string;
  user_id?: string;
  email?: string;
  full_name?: string;
  health_issues?: string | null;
  age?: number | string | null;
  gender?: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  medications?: string | null;
  is_profile_complete?: boolean;
}

export interface DoctorVerificationData {
  id: string;
  name: string;
  specialty: string;
  license_number?: string | null;
  qualification_proof?: string | null;
  verification_status: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  is_active?: boolean;
  avatar_url?: string;
  bio?: string;
  calendar_id?: string;
}

/**
 * Gate 1: Email Validation Gate
 * Validates email format strictly.
 * Returns isValid = false if the email is empty or malformed.
 */
export function validateEmailGate(email: string | null | undefined): {
  isValid: boolean;
  normalizedEmail?: string;
  error?: string;
} {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { isValid: false, error: "Email address is required." };
  }

  const clean = email.trim().toLowerCase();
  const result = emailSchema.safeParse(clean);

  if (!result.success) {
    return {
      isValid: false,
      error: "Please enter a valid, correctly formatted email address (e.g. name@domain.com).",
    };
  }

  return {
    isValid: true,
    normalizedEmail: result.data,
  };
}

/**
 * Gate 2: Patient Profile Completion Gate
 * Validates that the patient has completed both:
 * 1. Stated health issue(s)
 * 2. Remaining profile fields (age, etc.)
 */
export function validatePatientProfileGate(profile: PatientProfileData | null | undefined): {
  isComplete: boolean;
  missingFields: string[];
  error?: string;
} {
  const missingFields: string[] = [];

  if (!profile) {
    return {
      isComplete: false,
      missingFields: ["health_issues", "age"],
      error: "Health profile is missing. Please describe your health issues and complete your profile.",
    };
  }

  const healthIssues = typeof profile.health_issues === "string" ? profile.health_issues.trim() : "";
  if (!healthIssues || healthIssues.length < 5) {
    missingFields.push("health_issues");
  }

  const numericAge = Number(profile.age);
  if (profile.age === null || profile.age === undefined || isNaN(numericAge) || numericAge < 1 || numericAge > 125) {
    missingFields.push("age");
  }

  if (missingFields.length > 0 || profile.is_profile_complete !== true) {
    return {
      isComplete: false,
      missingFields,
      error: `Incomplete health profile. Required fields missing: ${missingFields.join(", ")}.`,
    };
  }

  return {
    isComplete: true,
    missingFields: [],
  };
}

/**
 * Gate 3: Doctor Credential Approval Gate
 * Doctors must have submitted proof of qualification (license number and qualification proof)
 * and have an 'approved' verification status from an administrator.
 */
export function validateDoctorApprovalGate(doctor: DoctorVerificationData | null | undefined): {
  isApproved: boolean;
  error?: string;
} {
  if (!doctor) {
    return { isApproved: false, error: "Doctor profile is missing or not found." };
  }

  // Completeness check: Do not store or display incomplete doctor details
  if (!doctor.name || !doctor.name.trim()) {
    return { isApproved: false, error: "Incomplete doctor details: Doctor name is required." };
  }
  if (!doctor.specialty || !doctor.specialty.trim()) {
    return { isApproved: false, error: "Incomplete doctor details: Medical specialty is required." };
  }
  if (!doctor.license_number || !doctor.license_number.trim()) {
    return { isApproved: false, error: "Incomplete doctor details: Medical license proof is required." };
  }
  if (!doctor.qualification_proof || !doctor.qualification_proof.trim()) {
    return { isApproved: false, error: "Incomplete doctor details: Proof of qualification document/certificate is required." };
  }

  // Approval status check: Doctors without approved status must not be shown or recommended
  if (doctor.verification_status !== "approved" || doctor.is_approved === false) {
    return {
      isApproved: false,
      error: `Doctor ${doctor.name} is not verified. Current status: ${doctor.verification_status}. Admin approval is required.`,
    };
  }

  return { isApproved: true };
}

/**
 * Gate 4: Patient-to-Doctor Matching Gate
 * Doctor suggestions depend on:
 * 1. Patient profile data being present and valid.
 * 2. Only doctors with verified/approved credentials being considered.
 */
export function matchDoctorToPatient(
  patientProfile: PatientProfileData | null | undefined,
  availableDoctors: DoctorVerificationData[]
): {
  success: boolean;
  matchedDoctor?: DoctorVerificationData;
  eligibleDoctors: DoctorVerificationData[];
  error?: string;
} {
  // 1. Patient Profile Gate
  const patientGate = validatePatientProfileGate(patientProfile);
  if (!patientGate.isComplete) {
    return {
      success: false,
      eligibleDoctors: [],
      error: `Doctor suggestions require a complete health profile: ${patientGate.error}`,
    };
  }

  // 2. Doctor Approval Gate (Filter only approved and active doctors)
  const approvedDoctors = (availableDoctors || []).filter((doc) => {
    return validateDoctorApprovalGate(doc).isApproved && doc.is_active !== false;
  });

  if (approvedDoctors.length === 0) {
    return {
      success: false,
      eligibleDoctors: [],
      error: "No verified and approved physicians are currently available in the system.",
    };
  }

  // 3. Match clinical specialty based on patient's stated health issue(s)
  const healthText = (patientProfile?.health_issues || "").toLowerCase();

  let matched = approvedDoctors.find((d) => {
    const specialty = d.specialty.toLowerCase();
    if (/\b(anxiety|stress|depression|panic|mental|mood|ptsd|trauma|burnout|sleep|insomnia)\b/i.test(healthText)) {
      return specialty.includes("psycholog") || specialty.includes("mental") || specialty.includes("psychiatr");
    }
    if (/\b(chest|heart|cardio|hypertension|blood pressure|palpitation|pulse)\b/i.test(healthText)) {
      return specialty.includes("cardio") || specialty.includes("heart");
    }
    if (/\b(skin|rash|acne|eczema|dermat|mole|lesion|itch|psoriasis)\b/i.test(healthText)) {
      return specialty.includes("dermat") || specialty.includes("skin");
    }
    return false;
  });

  // Default to General Practitioner / Internal Medicine
  if (!matched) {
    matched =
      approvedDoctors.find(
        (d) =>
          d.specialty.toLowerCase().includes("general") ||
          d.specialty.toLowerCase().includes("internal")
      ) || approvedDoctors[0];
  }

  return {
    success: true,
    matchedDoctor: matched,
    eligibleDoctors: approvedDoctors,
  };
}
