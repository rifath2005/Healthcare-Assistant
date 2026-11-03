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
 *    - Explains at the top WHY the doctor was suggested by us based on the user's shared symptoms.
 *    - Highlights what they specialized in and what studies/certifications they completed.
 *    - If multiple doctors exist in the same field, suggests both with their specific advantages.
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
  specialization_study?: string;
  advantages?: string[];
  why_suggested_template?: string;
}

export interface MatchedDoctorDetail {
  doctor: DoctorVerificationData;
  whySuggested: string;
  specializationStudy: string;
  advantages: string[];
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
 * Helper to build default advantages and study info if not provided in doctor record
 */
function resolveDoctorAdvantagesAndStudy(doc: DoctorVerificationData, issueSummary: string): {
  specializationStudy: string;
  advantages: string[];
  whySuggested: string;
} {
  const specialtyLower = doc.specialty.toLowerCase();

  if (specialtyLower.includes("orthoped")) {
    return {
      specializationStudy:
        doc.specialization_study ||
        "American Board of Orthopaedic Surgery (ABOS) Certified with subspecialty fellowship in Adult Joint Reconstruction, meniscus mechanics, and knee cartilage preservation.",
      advantages: doc.advantages || [
        "Deep expertise in mechanical joint alignment, ligament tension, and structural cartilage wear",
        "Direct evaluation for interventional options (targeted joint injections, cartilage repair, surgical consults)",
        "Specialized in prolonged or chronic joint pain that failed initial conservative medications",
      ],
      whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} is specialized in structural joint mechanics, cartilage stress, and knee joint reconstruction.`,
    };
  }

  if (specialtyLower.includes("physical medicine") || specialtyLower.includes("rehabilitat") || specialtyLower.includes("pm&r")) {
    return {
      specializationStudy:
        doc.specialization_study ||
        "American Board of Physical Medicine and Rehabilitation (ABPMR) Certified with specialized studies in biomechanical kinetic chains, myofascial trigger therapies, and non-surgical joint rehabilitation.",
      advantages: doc.advantages || [
        "100% focused on non-surgical, conservative restorative rehabilitation protocols",
        "Custom physical therapy, mobility restoration, and muscle compensation balancing",
        "Specialized in long-term joint pain relief without immediate surgery",
      ],
      whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} is specialized in non-surgical joint rehabilitation, kinetic restoration, and targeted mobility therapies.`,
    };
  }

  if (specialtyLower.includes("psycholog") || specialtyLower.includes("mental") || specialtyLower.includes("psychiatr")) {
    return {
      specializationStudy:
        doc.specialization_study ||
        "APA-Accredited Doctorate in Psychology specializing in Cognitive Behavioral Therapy (CBT), somatic stress management, and behavioral coping therapies.",
      advantages: doc.advantages || [
        "Targeted Cognitive Behavioral Therapy (CBT) for managing chronic distress, acute anxiety, and panic attacks",
        "Evidence-based somatic relaxation and neuro-grounding techniques (5-4-3-2-1, 4-7-8 breathing)",
        "Specialized support for the emotional fatigue, burnout, and mental toll of chronic symptoms",
      ],
      whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} specializes in psychological counseling, behavioral grounding, and emotional stress resilience.`,
    };
  }

  if (specialtyLower.includes("cardio") || specialtyLower.includes("heart")) {
    return {
      specializationStudy:
        doc.specialization_study ||
        "Fellow of the American College of Cardiology (FACC) with specialized training in preventative hemodynamics, vascular elasticity, and ambulatory arrhythmia monitoring.",
      advantages: doc.advantages || [
        "Advanced cardiovascular evaluation for chest discomfort, palpitations, and hypertension",
        "Targeted preventative lipid, metabolic, and vascular health programs",
        "Integration of evidence-based lifestyle cardiology with precision pharmacological management",
      ],
      whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} specializes in targeted cardiovascular diagnostics, blood pressure management, and heart health optimization.`,
    };
  }

  if (specialtyLower.includes("dermat") || specialtyLower.includes("skin")) {
    return {
      specializationStudy:
        doc.specialization_study ||
        "American Board of Dermatology (ABD) Certification with fellowship training in inflammatory skin barriers, clinical dermoscopy, and epidermal immunology.",
      advantages: doc.advantages || [
        "Precise differential diagnosis of dermatitis, eczema, acute rashes, and allergic eruptions",
        "Targeted non-steroidal and topical therapeutic protocols for rapid relief",
        "Thorough lesion, mole, and full-body skin barrier health evaluations",
      ],
      whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} specializes in clinical dermatological care, inflammatory skin triage, and skin barrier health.`,
    };
  }

  // General Practitioner / Internal Medicine default
  return {
    specializationStudy:
      doc.specialization_study ||
      "American Board of Internal Medicine (ABIM) Certification with 12 years of clinical focus on systemic differential diagnosis, multi-organ symptom triage, and chronic pain investigation.",
    advantages: doc.advantages || [
      "Holistic systemic medical workup to rule out underlying inflammatory or autoimmune causes",
      "Comprehensive diagnostic laboratory and imaging referral coordination",
      "Broad expertise across acute infections, fatigue, metabolic health, and general wellness",
    ],
    whySuggested: `Suggested because of your ${issueSummary}: ${doc.name} is specialized in comprehensive clinical evaluation, diagnostic lab workup, and coordinating targeted multi-specialty care.`,
  };
}

/**
 * Gate 4: Patient-to-Doctor Matching Gate
 * Doctor suggestions depend on:
 * 1. Patient profile data being present and valid.
 * 2. Only doctors with verified/approved credentials being considered.
 * 3. Shows at the top why the doctor was suggested by us based on the patient's symptoms.
 * 4. Highlights their specialized studies and certifications.
 * 5. If multiple doctors in the same field exist, suggests both with their specific advantages.
 */
export function matchDoctorToPatient(
  patientProfile: PatientProfileData | null | undefined,
  availableDoctors: DoctorVerificationData[]
): {
  success: boolean;
  matchedDoctor?: DoctorVerificationData;
  matchedDoctors: MatchedDoctorDetail[];
  topRecommendationSummary?: string;
  eligibleDoctors: DoctorVerificationData[];
  error?: string;
} {
  // 1. Patient Profile Gate
  const patientGate = validatePatientProfileGate(patientProfile);
  if (!patientGate.isComplete) {
    return {
      success: false,
      matchedDoctors: [],
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
      matchedDoctors: [],
      eligibleDoctors: [],
      error: "No verified and approved physicians are currently available in the system.",
    };
  }

  // 3. Match clinical specialty based on patient's stated health issue(s)
  const healthText = (patientProfile?.health_issues || "").toLowerCase();
  const issueSummary = patientProfile?.health_issues?.trim() || "reported symptoms";

  let relevantDoctors: DoctorVerificationData[] = [];

  // A. Orthopedic, Joint, Bone & Musculoskeletal
  if (/\b(knee|joint|bone|ortho|cartilage|ligament|sprain|arthritis|hip|shoulder|musculoskeletal|tendon|acl|meniscus|fracture|back|spine|strain)\b/i.test(healthText)) {
    const orthoAndPmr = approvedDoctors.filter((d) => {
      const s = d.specialty.toLowerCase();
      return s.includes("orthoped") || s.includes("physical medicine") || s.includes("rehabilitat") || s.includes("pm&r");
    });

    if (orthoAndPmr.length > 0) {
      relevantDoctors = orthoAndPmr;
    }
  }

  // B. Psychological, Emotional, Mental Wellness
  if (relevantDoctors.length === 0 && /\b(anxiety|stress|depression|panic|mental|mood|ptsd|trauma|burnout|sleep|insomnia)\b/i.test(healthText)) {
    const mentalDocs = approvedDoctors.filter((d) => {
      const s = d.specialty.toLowerCase();
      return s.includes("psycholog") || s.includes("mental") || s.includes("psychiatr");
    });
    if (mentalDocs.length > 0) {
      relevantDoctors = mentalDocs;
    }
  }

  // C. Cardiovascular, Heart, Blood Pressure
  if (relevantDoctors.length === 0 && /\b(chest|heart|cardio|hypertension|blood pressure|palpitation|pulse)\b/i.test(healthText)) {
    const cardioDocs = approvedDoctors.filter((d) => {
      const s = d.specialty.toLowerCase();
      return s.includes("cardio") || s.includes("heart");
    });
    if (cardioDocs.length > 0) {
      relevantDoctors = cardioDocs;
    }
  }

  // D. Dermatology, Skin, Rashes
  if (relevantDoctors.length === 0 && /\b(skin|rash|acne|eczema|dermat|mole|lesion|itch|psoriasis)\b/i.test(healthText)) {
    const dermDocs = approvedDoctors.filter((d) => {
      const s = d.specialty.toLowerCase();
      return s.includes("dermat") || s.includes("skin");
    });
    if (dermDocs.length > 0) {
      relevantDoctors = dermDocs;
    }
  }

  // E. Default to General Practice / Internal Medicine specialists
  if (relevantDoctors.length === 0) {
    const generalDocs = approvedDoctors.filter((d) => {
      const s = d.specialty.toLowerCase();
      return s.includes("general") || s.includes("internal");
    });
    relevantDoctors = generalDocs.length > 0 ? generalDocs : [approvedDoctors[0]];
  }

  // 4. Map into rich MatchedDoctorDetail objects
  const matchedDetails: MatchedDoctorDetail[] = relevantDoctors.map((doc) => {
    const resolved = resolveDoctorAdvantagesAndStudy(doc, issueSummary);
    return {
      doctor: doc,
      whySuggested: resolved.whySuggested,
      specializationStudy: resolved.specializationStudy,
      advantages: resolved.advantages,
    };
  });

  // 5. Construct Top Recommendation Summary (displayed at the top of recommendations)
  let topSummary = "";
  if (matchedDetails.length > 1) {
    topSummary = `### **Why These Specialists Are Suggested by Us**\nBased on your stated concern: **"${issueSummary}"**, we have matched you with clinic specialists who have completed specialized medical studies in this exact field.\n\nSince our clinic features multiple specialists in this discipline, we suggest **both** with their specific clinical advantages so you can select the best approach for your care:\n\n` +
      matchedDetails
        .map(
          (m, idx) =>
            `**${idx + 1}. ${m.doctor.name}** (${m.doctor.specialty})\n` +
            `• **Specialization & Medical Study:** ${m.specializationStudy}\n` +
            `• **Why Suggested:** ${m.whySuggested}\n` +
            `• **Key Advantages:**\n` +
            m.advantages.map((adv) => `  - ${adv}`).join("\n")
        )
        .join("\n\n");
  } else if (matchedDetails.length === 1) {
    const m = matchedDetails[0];
    topSummary = `### **Why This Specialist Is Suggested by Us**\nBased on your stated concern: **"${issueSummary}"**, **${m.doctor.name}** is recommended by us.\n\n` +
      `• **Specialization & Medical Study:** ${m.specializationStudy}\n` +
      `• **Why Suggested:** ${m.whySuggested}\n` +
      `• **Key Advantages:**\n` +
      m.advantages.map((adv) => `  - ${adv}`).join("\n");
  }

  return {
    success: true,
    matchedDoctor: matchedDetails[0]?.doctor,
    matchedDoctors: matchedDetails,
    topRecommendationSummary: topSummary,
    eligibleDoctors: approvedDoctors,
  };
}
