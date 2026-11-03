import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/doctor/apply/route";
import { NextRequest } from "next/server";
import {
  validateDoctorApprovalGate,
  matchDoctorToPatient,
  type PatientProfileData,
} from "@/lib/validationArchitecture";
import { CLINIC_DOCTORS } from "@/lib/doctors";

// Mock Supabase admin client
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

describe("Doctor Listing Request & Credentialing Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/doctor/apply - Completeness & Validation", () => {
    it("should reject submissions missing doctor name", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "",
          email: "dr.smith@clinic.com",
          specialty: "Cardiology",
          license_number: "MD-LIC-9912",
          qualification_proof: "ABIM Board Certificate",
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Physician full name is required/i);
    });

    it("should reject submissions with invalid or missing work email", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr. Jane Smith, MD",
          email: "notanemail",
          specialty: "Cardiology",
          license_number: "MD-LIC-9912",
          qualification_proof: "ABIM Board Certificate",
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/valid.*email/i);
    });

    it("should reject submissions missing medical specialty", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr. Jane Smith, MD",
          email: "dr.smith@clinic.com",
          specialty: "",
          license_number: "MD-LIC-9912",
          qualification_proof: "ABIM Board Certificate",
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Medical specialty is required/i);
    });

    it("should reject submissions missing medical license number", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr. Jane Smith, MD",
          email: "dr.smith@clinic.com",
          specialty: "Cardiology",
          license_number: "",
          qualification_proof: "ABIM Board Certificate",
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Medical license number is required/i);
    });

    it("should reject submissions missing proof of qualification document", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr. Jane Smith, MD",
          email: "dr.smith@clinic.com",
          specialty: "Cardiology",
          license_number: "MD-LIC-9912",
          qualification_proof: "",
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/Proof of qualification.*is required/i);
    });

    it("should accept complete application and register with 'pending' verification status", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctor/apply", {
        method: "POST",
        body: JSON.stringify({
          name: "Dr. Rebecca Sterling, MD",
          email: "rebecca.sterling@healthcare.local",
          specialty: "Neurology & Headache Specialist",
          license_number: "NEUR-LIC-2024-7719",
          qualification_proof: "Verified State Medical Board License & American Board of Psychiatry and Neurology (ABPN)",
          specialization_study: "ABPN Board-certified in Neurology with fellowship in intractable migraine and autonomic nerve disorders.",
          advantages: [
            "Precision differential diagnosis for acute and chronic migraines",
            "Non-invasive neuromodulation and preventative pharmacological protocols",
          ],
          bio: "Specializing in neurological headache disorders and autonomic function.",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.doctor).toBeDefined();
      expect(data.doctor.verification_status).toBe("pending");
      expect(data.doctor.is_approved).toBe(false);
      expect(data.doctor.license_number).toBe("NEUR-LIC-2024-7719");
    });
  });

  describe("Doctor Verification Gating on Listing Requests", () => {
    it("should ensure a pending doctor applicant is NEVER suggested or matched to patients", () => {
      // Find the applied doctor in CLINIC_DOCTORS or mock one
      const pendingApplicant = CLINIC_DOCTORS.find(
        (d) => d.email === "rebecca.sterling@healthcare.local"
      ) || {
        id: "doc-pending-test",
        name: "Dr. Rebecca Sterling, MD",
        specialty: "Neurology",
        license_number: "NEUR-LIC-2024-7719",
        qualification_proof: "Verified ABPN Certificate",
        verification_status: "pending" as const,
        is_approved: false,
        is_active: false,
      };

      // 1. Verification Gate
      const gateResult = validateDoctorApprovalGate(pendingApplicant);
      expect(gateResult.isApproved).toBe(false);
      expect(gateResult.error).toMatch(/Current status: pending\. Admin approval is required/i);

      // 2. Patient Matching Gate
      const patient: PatientProfileData = {
        health_issues: "Debilitating throbbing migraine headaches for 2 months",
        age: 36,
        is_profile_complete: true,
      };

      const matchResult = matchDoctorToPatient(patient, [pendingApplicant]);
      expect(matchResult.success).toBe(false);
      expect(matchResult.matchedDoctor).toBeUndefined();
      expect(matchResult.eligibleDoctors).toHaveLength(0);
      expect(matchResult.error).toMatch(/No verified and approved physicians are currently available/i);
    });

    it("should allow doctor to be suggested and booked once admin approves their credentials", () => {
      const approvedDoctor = {
        id: "doc-approved-neurology",
        name: "Dr. Rebecca Sterling, MD",
        specialty: "Neurology & Headache Specialist",
        license_number: "NEUR-LIC-2024-7719",
        qualification_proof: "Verified State Medical Board License & ABPN",
        verification_status: "approved" as const,
        is_approved: true,
        is_active: true,
        specialization_study: "ABPN Board-certified in Neurology with fellowship in intractable migraine.",
        advantages: ["Precision differential diagnosis for acute and chronic migraines"],
      };

      // 1. Verification Gate now passes
      const gateResult = validateDoctorApprovalGate(approvedDoctor);
      expect(gateResult.isApproved).toBe(true);
      expect(gateResult.error).toBeUndefined();

      // 2. Patient Matching Gate now succeeds
      const patient: PatientProfileData = {
        health_issues: "Debilitating throbbing migraine headaches for 2 months",
        age: 36,
        is_profile_complete: true,
      };

      const matchResult = matchDoctorToPatient(patient, [approvedDoctor]);
      expect(matchResult.success).toBe(true);
      expect(matchResult.matchedDoctor?.id).toBe("doc-approved-neurology");
      expect(matchResult.eligibleDoctors).toHaveLength(1);
    });
  });
});
