import { describe, it, expect } from "vitest";
import {
  validateEmailGate,
  validateDoctorIdentifierGate,
  validatePatientProfileGate,
  validateDoctorApprovalGate,
  matchDoctorToPatient,
  type PatientProfileData,
  type DoctorVerificationData,
} from "@/lib/validationArchitecture";

describe("Healthcare Validation Architecture Gates", () => {
  // =========================================================================
  // Gate 1: Login Page Email-First Flow
  // "The user enters an email address first. The password field must stay
  //  hidden or disabled until the email is validated as a correctly formatted
  //  address. If the email is invalid, the password field must not appear and
  //  access must not be possible."
  // =========================================================================
  describe("Gate 1: Email Validation Gate", () => {
    it("should reject invalid email formats and prevent progression to password field", () => {
      const invalidEmails = [
        "",
        "   ",
        "notanemail",
        "missingatsign.com",
        "@nodomain.com",
        "username@",
        "user@.com",
        "user@domain",
        "user name@domain.com",
        "user@domain..com",
        null,
        undefined,
      ];

      for (const email of invalidEmails) {
        const result = validateEmailGate(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.normalizedEmail).toBeUndefined();
      }
    });

    it("should validate and normalize correct email addresses allowing password entry", () => {
      const validEmails = [
        { raw: "patient@healthcare.com", expected: "patient@healthcare.com" },
        { raw: "PATIENT.CLINIC@DOMAIN.ORG", expected: "patient.clinic@domain.org" },
        { raw: "  dr.smith+triage@clinic.co.uk  ", expected: "dr.smith+triage@clinic.co.uk" },
        { raw: "user123@sub.domain.med", expected: "user123@sub.domain.med" },
        { raw: "ADMIN@HEALTHCARE.LOCAL", expected: "admin@healthcare.local" },
      ];

      for (const { raw, expected } of validEmails) {
        const result = validateEmailGate(raw);
        expect(result.isValid).toBe(true);
        expect(result.normalizedEmail).toBe(expected);
        expect(result.error).toBeUndefined();
      }
    });

    it("should reject uppercase constraints if unhandled or normalize automatically", () => {
      // Mixed case must automatically normalize to lowercase
      const mixedCase = "Doctor.Elena.Rostova@HealthCare.Local";
      const res = validateEmailGate(mixedCase);
      expect(res.isValid).toBe(true);
      expect(res.normalizedEmail).toBe("doctor.elena.rostova@healthcare.local");
      expect(res.normalizedEmail).not.toMatch(/[A-Z]/);
    });

    it("should strictly gate password section access across user, doctor, admin, and signup", () => {
      // 1. User & Admin invalid email -> password section must not be accessible
      const invalidUserEmail = "not-a-valid-email";
      const userGate = validateEmailGate(invalidUserEmail);
      expect(userGate.isValid).toBe(false);
      // Access must be blocked
      const canAccessUserPassword = userGate.isValid;
      expect(canAccessUserPassword).toBe(false);

      // 2. Doctor Portal -> invalid email or code -> password section must not be accessible
      const invalidDoctorInput = "invalid doc";
      const doctorGate = validateDoctorIdentifierGate(invalidDoctorInput);
      expect(doctorGate.isValid).toBe(false);
      const canAccessDoctorPassword = doctorGate.isValid;
      expect(canAccessDoctorPassword).toBe(false);

      // 3. Valid email -> unlocks password section access
      const validEmail = "USER@CLINIC.COM";
      const validGate = validateEmailGate(validEmail);
      expect(validGate.isValid).toBe(true);
      expect(validGate.normalizedEmail).toBe("user@clinic.com");
      const canAccessPasswordNow = validGate.isValid;
      expect(canAccessPasswordNow).toBe(true);

      // 4. Valid doctor identifier -> unlocks security PIN section access
      const validDocCode = "DR-ROSTOVA-102";
      const validDocGate = validateDoctorIdentifierGate(validDocCode);
      expect(validDocGate.isValid).toBe(true);
      expect(validDocGate.normalized).toBe("dr-rostova-102");
    });
  });

  // =========================================================================
  // Gate 2: Mandatory Health Profile Before Main Experience
  // "After a successful login, the user must not reach the main page or
  //  conversational page directly. First they must describe their health
  //  issue(s). Only after that should the remaining profile fields (such as
  //  age and other details) be collected. Only once the profile is complete
  //  should the user be routed to the main page and the conversational page."
  // =========================================================================
  describe("Gate 2: Patient Profile Completion Gate", () => {
    it("should reject empty or null patient profile", () => {
      const resultNull = validatePatientProfileGate(null);
      expect(resultNull.isComplete).toBe(false);
      expect(resultNull.missingFields).toContain("health_issues");
      expect(resultNull.missingFields).toContain("age");

      const resultUndefined = validatePatientProfileGate(undefined);
      expect(resultUndefined.isComplete).toBe(false);
    });

    it("should reject profile when health issue description is missing or too brief", () => {
      const missingHealthIssues: PatientProfileData[] = [
        { health_issues: null, age: 35, is_profile_complete: true },
        { health_issues: "", age: 35, is_profile_complete: true },
        { health_issues: "   ", age: 35, is_profile_complete: true },
        { health_issues: "pain", age: 35, is_profile_complete: true }, // < 5 characters
      ];

      for (const profile of missingHealthIssues) {
        const result = validatePatientProfileGate(profile);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toContain("health_issues");
      }
    });

    it("should reject profile when age is missing, non-numeric, or physiologically out of range", () => {
      const invalidAges: PatientProfileData[] = [
        { health_issues: "Persistent migraine with light sensitivity", age: null, is_profile_complete: true },
        { health_issues: "Persistent migraine with light sensitivity", age: undefined, is_profile_complete: true },
        { health_issues: "Persistent migraine with light sensitivity", age: "not-a-number", is_profile_complete: true },
        { health_issues: "Persistent migraine with light sensitivity", age: 0, is_profile_complete: true },
        { health_issues: "Persistent migraine with light sensitivity", age: -10, is_profile_complete: true },
        { health_issues: "Persistent migraine with light sensitivity", age: 130, is_profile_complete: true }, // > 125
      ];

      for (const profile of invalidAges) {
        const result = validatePatientProfileGate(profile);
        expect(result.isComplete).toBe(false);
        expect(result.missingFields).toContain("age");
      }
    });

    it("should reject profile if is_profile_complete flag is false despite filled fields", () => {
      const incompleteFlagProfile: PatientProfileData = {
        health_issues: "Severe tension headache radiating to neck",
        age: 42,
        is_profile_complete: false,
      };

      const result = validatePatientProfileGate(incompleteFlagProfile);
      expect(result.isComplete).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should accept complete profile with health issues stated and valid age", () => {
      const completeProfile: PatientProfileData = {
        health_issues: "Chronic lower back stiffness worsening after prolonged sitting",
        age: 38,
        gender: "female",
        medical_history: "Mild hypertension, seasonal allergies",
        is_profile_complete: true,
      };

      const result = validatePatientProfileGate(completeProfile);
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });
  });

  // =========================================================================
  // Gate 3: Doctor Verification Through Admin
  // "Doctors must not appear as valid or usable in the system without
  //  verification. The doctor portal must require the doctor to submit their
  //  proof of qualification (license, certificate, or equivalent documents).
  //  An admin must review those documents and approve or reject each doctor.
  //  Doctors without an approved status must not be shown to patients or
  //  recommended to them. Do not store or display incomplete doctor details."
  // =========================================================================
  describe("Gate 3: Doctor Credential Approval Gate", () => {
    const validDoctorTemplate: DoctorVerificationData = {
      id: "doc-1",
      name: "Dr. Elena Rostova, MD",
      specialty: "General Practice & Internal Medicine",
      license_number: "MD-LIC-2024-8841",
      qualification_proof: "Verified State Medical Board License & ABIM Board Certification",
      verification_status: "approved",
      is_approved: true,
      is_active: true,
    };

    it("should reject doctors with incomplete details (missing name, specialty, license, or proof)", () => {
      const incompleteDoctors: Partial<DoctorVerificationData>[] = [
        { ...validDoctorTemplate, name: "" },
        { ...validDoctorTemplate, name: "   " },
        { ...validDoctorTemplate, specialty: "" },
        { ...validDoctorTemplate, license_number: "" },
        { ...validDoctorTemplate, license_number: null },
        { ...validDoctorTemplate, qualification_proof: "" },
        { ...validDoctorTemplate, qualification_proof: null },
      ];

      for (const doc of incompleteDoctors) {
        const result = validateDoctorApprovalGate(doc as DoctorVerificationData);
        expect(result.isApproved).toBe(false);
        expect(result.error).toMatch(/Incomplete doctor details/i);
      }
    });

    it("should reject doctors with 'pending' verification status awaiting admin review", () => {
      const pendingDoctor: DoctorVerificationData = {
        ...validDoctorTemplate,
        verification_status: "pending",
        is_approved: false,
      };

      const result = validateDoctorApprovalGate(pendingDoctor);
      expect(result.isApproved).toBe(false);
      expect(result.error).toMatch(/not verified.*Current status: pending/i);
    });

    it("should reject doctors with 'rejected' verification status", () => {
      const rejectedDoctor: DoctorVerificationData = {
        ...validDoctorTemplate,
        verification_status: "rejected",
        is_approved: false,
      };

      const result = validateDoctorApprovalGate(rejectedDoctor);
      expect(result.isApproved).toBe(false);
      expect(result.error).toMatch(/not verified.*Current status: rejected/i);
    });

    it("should reject doctors where is_approved is false despite approved verification_status", () => {
      const mismatchedDoctor: DoctorVerificationData = {
        ...validDoctorTemplate,
        verification_status: "approved",
        is_approved: false,
      };

      const result = validateDoctorApprovalGate(mismatchedDoctor);
      expect(result.isApproved).toBe(false);
    });

    it("should approve verified doctors with complete qualifications and approved status", () => {
      const result = validateDoctorApprovalGate(validDoctorTemplate);
      expect(result.isApproved).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  // =========================================================================
  // Gate 4: Validation Architecture & Patient-Doctor Matching
  // "Doctor validation must happen before any doctor is suggested to a patient.
  //  Doctor suggestions must depend on the patient's profile data being present
  //  and valid. Patients must not be matched to doctors without verified
  //  credentials or without enough information from the patient."
  // =========================================================================
  describe("Gate 4: Validation Architecture & Doctor Matching", () => {
    const approvedDoctors: DoctorVerificationData[] = [
      {
        id: "doc-gp",
        name: "Dr. Elena Rostova, MD",
        specialty: "General Practice & Internal Medicine",
        license_number: "MD-LIC-2024-8841",
        qualification_proof: "Verified State Medical Board License",
        verification_status: "approved",
        is_approved: true,
        is_active: true,
      },
      {
        id: "doc-psych",
        name: "Dr. Marcus Vance, PsyD",
        specialty: "Clinical Psychologist & Mental Wellness",
        license_number: "PSY-LIC-2023-4102",
        qualification_proof: "Verified Clinical Psychology State License",
        verification_status: "approved",
        is_approved: true,
        is_active: true,
      },
      {
        id: "doc-cardio",
        name: "Dr. Sarah Lin, MD",
        specialty: "Cardiology & Preventative Health",
        license_number: "MD-LIC-2024-5519",
        qualification_proof: "FACC Board Certification in Cardiovascular Disease",
        verification_status: "approved",
        is_approved: true,
        is_active: true,
      },
      {
        id: "doc-derm",
        name: "Dr. Alex Rivera, MD",
        specialty: "Dermatology & Skin Health",
        license_number: "MD-LIC-2024-3320",
        qualification_proof: "ABD Board Certified in Dermatology",
        verification_status: "approved",
        is_approved: true,
        is_active: true,
      },
    ];

    const unapprovedDoctors: DoctorVerificationData[] = [
      {
        id: "doc-pending",
        name: "Dr. Unverified Clinician",
        specialty: "Cardiology",
        license_number: "MD-LIC-PENDING",
        qualification_proof: "Document awaiting admin verification",
        verification_status: "pending",
        is_approved: false,
        is_active: true,
      },
      {
        id: "doc-rejected",
        name: "Dr. Revoked Clinician",
        specialty: "Dermatology",
        license_number: "MD-LIC-REVOKED",
        qualification_proof: "Invalid license",
        verification_status: "rejected",
        is_approved: false,
        is_active: true,
      },
    ];

    it("should refuse to suggest doctors when patient profile is missing or incomplete", () => {
      const incompleteProfile: PatientProfileData = {
        health_issues: "", // Missing health issue
        age: 30,
        is_profile_complete: false,
      };

      const result = matchDoctorToPatient(incompleteProfile, approvedDoctors);
      expect(result.success).toBe(false);
      expect(result.matchedDoctor).toBeUndefined();
      expect(result.error).toMatch(/Doctor suggestions require a complete health profile/i);
    });

    it("should never suggest unapproved or unverified doctors to patients", () => {
      const patientProfile: PatientProfileData = {
        health_issues: "Frequent heart palpitations and elevated blood pressure",
        age: 55,
        is_profile_complete: true,
      };

      // Only unapproved doctors available
      const result = matchDoctorToPatient(patientProfile, unapprovedDoctors);
      expect(result.success).toBe(false);
      expect(result.eligibleDoctors).toHaveLength(0);
      expect(result.error).toMatch(/No verified and approved physicians are currently available/i);
    });

    it("should match psychological symptoms to verified mental wellness specialist", () => {
      const mentalHealthPatient: PatientProfileData = {
        health_issues: "Severe generalized anxiety, panic attacks, and acute work stress burnout",
        age: 29,
        is_profile_complete: true,
      };

      const result = matchDoctorToPatient(mentalHealthPatient, [...approvedDoctors, ...unapprovedDoctors]);
      expect(result.success).toBe(true);
      expect(result.matchedDoctor?.id).toBe("doc-psych");
      expect(result.matchedDoctor?.specialty).toContain("Psychologist");
      // Verified that unapproved doctors were filtered out
      expect(result.eligibleDoctors.every((d) => d.verification_status === "approved" && d.is_approved)).toBe(true);
    });

    it("should match cardiovascular symptoms to verified cardiologist", () => {
      const cardiacPatient: PatientProfileData = {
        health_issues: "Chest tightness during exertion, shortness of breath, and palpitations",
        age: 62,
        is_profile_complete: true,
      };

      const result = matchDoctorToPatient(cardiacPatient, [...approvedDoctors, ...unapprovedDoctors]);
      expect(result.success).toBe(true);
      expect(result.matchedDoctor?.id).toBe("doc-cardio");
      expect(result.matchedDoctor?.specialty).toContain("Cardiology");
    });

    it("should match dermatological symptoms to verified dermatologist", () => {
      const dermPatient: PatientProfileData = {
        health_issues: "Spreading erythematous itchy skin rash and dermatitis lesions on both arms",
        age: 34,
        is_profile_complete: true,
      };

      const result = matchDoctorToPatient(dermPatient, [...approvedDoctors, ...unapprovedDoctors]);
      expect(result.success).toBe(true);
      expect(result.matchedDoctor?.id).toBe("doc-derm");
      expect(result.matchedDoctor?.specialty).toContain("Dermatology");
    });

    it("should match general non-specific symptoms to verified internal medicine physician", () => {
      const generalPatient: PatientProfileData = {
        health_issues: "General chronic fatigue, mild body aches, and persistent low-grade fever",
        age: 45,
        is_profile_complete: true,
      };

      const result = matchDoctorToPatient(generalPatient, [...approvedDoctors, ...unapprovedDoctors]);
      expect(result.success).toBe(true);
      expect(result.matchedDoctor?.id).toBe("doc-gp");
      expect(result.matchedDoctor?.specialty).toContain("General Practice");
    });

    it("should suggest both specialists with their distinct advantages when multiple doctors match the same field", () => {
      const orthopedicDoctors: DoctorVerificationData[] = [
        {
          id: "doc-ortho-chen",
          name: "Dr. Michael Chen, MD",
          specialty: "Orthopedic Surgery & Joint Reconstruction",
          license_number: "ORTH-LIC-2023-6610",
          qualification_proof: "Verified ABOS Orthopedic Board Certification",
          verification_status: "approved",
          is_approved: true,
          is_active: true,
          specialization_study: "American Board of Orthopaedic Surgery (ABOS) Certified with subspecialty fellowship in Joint Reconstruction and meniscus mechanics.",
          advantages: [
            "Specialized in structural joint mechanics, cartilage preservation, and surgical/interventional consults",
            "Direct evaluation for interventional joint injections and surgical repair",
          ],
        },
        {
          id: "doc-pmr-patel",
          name: "Dr. Anita Patel, MD",
          specialty: "Physical Medicine, Rehabilitation & Musculoskeletal Health",
          license_number: "PMR-LIC-2024-3381",
          qualification_proof: "Verified ABPMR Board Certification in PM&R",
          verification_status: "approved",
          is_approved: true,
          is_active: true,
          specialization_study: "American Board of Physical Medicine and Rehabilitation (ABPMR) Certified with specialized studies in biomechanical kinetic chains.",
          advantages: [
            "100% focused on non-surgical, conservative restorative rehabilitation protocols",
            "Targeted joint mobility therapy and chronic pain compensation balancing",
          ],
        },
      ];

      const kneePainPatient: PatientProfileData = {
        health_issues: "Dealing with sharp pain in my knee for four years after trying medications without lasting relief",
        age: 48,
        is_profile_complete: true,
      };

      const result = matchDoctorToPatient(kneePainPatient, [...orthopedicDoctors, ...approvedDoctors]);
      expect(result.success).toBe(true);
      // Both specialists in the joint/musculoskeletal field are suggested
      expect(result.matchedDoctors.length).toBeGreaterThanOrEqual(2);
      expect(result.matchedDoctors.some((m) => m.doctor.id === "doc-ortho-chen")).toBe(true);
      expect(result.matchedDoctors.some((m) => m.doctor.id === "doc-pmr-patel")).toBe(true);

      // Verify that why suggested is shown at the top and advantages are populated
      expect(result.topRecommendationSummary).toContain("Why These Specialists Are Suggested by Us");
      expect(result.topRecommendationSummary).toContain("knee");
      expect(result.topRecommendationSummary).toContain("Dr. Michael Chen, MD");
      expect(result.topRecommendationSummary).toContain("Dr. Anita Patel, MD");
      expect(result.topRecommendationSummary).toContain("Advantages");

      // Verify doctor specialization studies and advantages are present
      for (const matched of result.matchedDoctors) {
        expect(matched.whySuggested).toBeDefined();
        expect(matched.specializationStudy).toBeDefined();
        expect(matched.advantages.length).toBeGreaterThan(0);
      }
    });
  });
});
