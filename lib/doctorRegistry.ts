import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";
import { createAdminClient } from "@/lib/supabase/server";

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "doctors_registry.json");

const DEFAULT_WORKING_HOURS = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "16:00" },
};

/**
 * Ensures the doctors_registry.json file exists and returns all persisted doctors.
 */
export function getPersistedDoctors(): DoctorProfile[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(REGISTRY_FILE)) {
      const content = fs.readFileSync(REGISTRY_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list) && list.length > 0) {
        // Sync in-memory CLINIC_DOCTORS
        for (const doc of list) {
          const idx = CLINIC_DOCTORS.findIndex((d) => d.id === doc.id || d.email.toLowerCase() === doc.email?.toLowerCase());
          if (idx !== -1) {
            CLINIC_DOCTORS[idx] = { ...CLINIC_DOCTORS[idx], ...doc };
          } else {
            CLINIC_DOCTORS.push(doc);
          }
        }
        return list;
      }
    }

    // Initialize registry file with base clinic doctors
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(CLINIC_DOCTORS, null, 2), "utf-8");
    return [...CLINIC_DOCTORS];
  } catch (err) {
    console.warn("Could not read doctors_registry.json, falling back to in-memory:", err);
    return [...CLINIC_DOCTORS];
  }
}

/**
 * Saves all doctors to persistent storage and updates in-memory array.
 */
export function persistDoctors(doctors: DoctorProfile[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(doctors, null, 2), "utf-8");

    // Sync in-memory CLINIC_DOCTORS
    for (const doc of doctors) {
      const idx = CLINIC_DOCTORS.findIndex((d) => d.id === doc.id || d.email.toLowerCase() === doc.email?.toLowerCase());
      if (idx !== -1) {
        CLINIC_DOCTORS[idx] = { ...CLINIC_DOCTORS[idx], ...doc };
      } else {
        CLINIC_DOCTORS.push(doc);
      }
    }
  } catch (err) {
    console.error("Failed to write doctors_registry.json:", err);
  }
}

/**
 * Returns all doctors for Administrator inspection (including pending, approved, and rejected).
 */
export async function getAllDoctorsForAdmin(): Promise<DoctorProfile[]> {
  const localList = getPersistedDoctors();

  // Try fetching any extra rows from Supabase and merge
  try {
    const supabase = createAdminClient();
    const { data: dbDocs, error } = await supabase.from("doctors").select("*");

    if (!error && dbDocs && dbDocs.length > 0) {
      for (const dbDoc of dbDocs) {
        const localMatch = localList.find((d) => d.id === dbDoc.id);
        if (!localMatch) {
          // New row from DB: parse metadata if available
          const hours = dbDoc.working_hours || DEFAULT_WORKING_HOURS;
          const verificationMeta = (hours as any)?.__verification || {};

          const merged: DoctorProfile = {
            id: dbDoc.id,
            name: dbDoc.name,
            specialty: dbDoc.specialty,
            email: verificationMeta.email || `${dbDoc.name.toLowerCase().replace(/[^a-z]/g, "")}@healthcare.local`,
            clinicRoom: verificationMeta.clinicRoom || "HealthCare Clinic Suite",
            avatar_url: dbDoc.avatar_url || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
            bio: dbDoc.bio || `Specialist in ${dbDoc.specialty}`,
            calendar_id: dbDoc.calendar_id || "primary",
            clinicalCode: verificationMeta.clinicalCode || `DR-${dbDoc.id.slice(0, 4).toUpperCase()}`,
            license_number: verificationMeta.license_number || "",
            qualification_proof: verificationMeta.qualification_proof || "",
            verification_status: verificationMeta.verification_status || (dbDoc.is_active ? "approved" : "pending"),
            is_approved: verificationMeta.is_approved ?? dbDoc.is_active ?? false,
            is_active: dbDoc.is_active ?? true,
            working_hours: hours,
            specialization_study: verificationMeta.specialization_study,
            advantages: verificationMeta.advantages,
            rejection_reason: verificationMeta.rejection_reason,
          };
          localList.push(merged);
        }
      }
    }
  } catch {
    // Continue with local list
  }

  return localList;
}

/**
 * Returns strictly VERIFIED and APPROVED physicians for patient suggestions and booking.
 * Requirements:
 * - verification_status must be 'approved'
 * - is_approved must be true
 * - is_active must be true
 * - Details must be complete (license number & proof present)
 */
export async function getVerifiedApprovedDoctorsForPatients(): Promise<DoctorProfile[]> {
  const all = getPersistedDoctors();
  return all.filter((doc) => {
    return (
      doc.verification_status === "approved" &&
      doc.is_approved === true &&
      doc.is_active !== false &&
      Boolean(doc.license_number?.trim()) &&
      Boolean(doc.qualification_proof?.trim())
    );
  });
}

/**
 * Registers a new physician listing application with 'pending' verification status.
 */
export async function registerDoctorApplication(params: {
  id?: string;
  name: string;
  email: string;
  specialty: string;
  license_number: string;
  qualification_proof: string;
  specialization_study?: string;
  advantages?: string[];
  bio?: string;
  clinicRoom?: string;
  avatar_url?: string;
  working_hours?: Record<string, { start: string; end: string }>;
}): Promise<DoctorProfile> {
  const doctors = getPersistedDoctors();

  const trimmedEmail = params.email.trim().toLowerCase();
  const trimmedLicense = params.license_number.trim();
  const trimmedName = params.name.trim();
  const trimmedSpecialty = params.specialty.trim();
  const trimmedProof = params.qualification_proof.trim();

  const lastName = trimmedName.split(" ").pop()?.replace(/[^a-zA-Z]/g, "").toUpperCase() || "DOC";

  // Check if doctor exists by email or license
  const existingIdx = doctors.findIndex(
    (d) => d.email.toLowerCase() === trimmedEmail || d.license_number === trimmedLicense
  );

  let doctorId = params.id || (existingIdx !== -1 ? doctors[existingIdx].id : crypto.randomUUID());
  // Ensure valid UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(doctorId)) {
    doctorId = crypto.randomUUID();
  }

  const clinicalCode = `DR-${lastName}-${doctorId.slice(0, 4).toUpperCase()}`;

  const defaultAvatar =
    params.avatar_url?.trim() ||
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300";

  const newDoc: DoctorProfile = {
    id: doctorId,
    name: trimmedName,
    email: trimmedEmail,
    specialty: trimmedSpecialty,
    clinicRoom: params.clinicRoom?.trim() || "Room 101 - Clinical Consultation Suite",
    avatar_url: defaultAvatar,
    bio: params.bio?.trim() || `Physician specializing in ${trimmedSpecialty}.`,
    calendar_id: "primary",
    clinicalCode,
    license_number: trimmedLicense,
    qualification_proof: trimmedProof,
    verification_status: "pending",
    is_approved: false,
    is_active: false, // Inactive until approved by administrator
    working_hours: params.working_hours || DEFAULT_WORKING_HOURS,
    specialization_study: params.specialization_study?.trim() || undefined,
    advantages: params.advantages && params.advantages.length > 0 ? params.advantages : undefined,
  };

  if (existingIdx !== -1) {
    doctors[existingIdx] = { ...doctors[existingIdx], ...newDoc };
  } else {
    doctors.unshift(newDoc); // Place newest at top
  }

  persistDoctors(doctors);

  // Sync to Supabase doctors table
  try {
    const supabase = createAdminClient();
    const hoursWithMeta = {
      ...(newDoc.working_hours || DEFAULT_WORKING_HOURS),
      __verification: {
        email: trimmedEmail,
        clinicRoom: newDoc.clinicRoom,
        clinicalCode,
        license_number: trimmedLicense,
        qualification_proof: trimmedProof,
        verification_status: "pending",
        is_approved: false,
        specialization_study: newDoc.specialization_study,
        advantages: newDoc.advantages,
      },
    };

    await supabase.from("doctors").upsert(
      {
        id: doctorId,
        name: trimmedName,
        specialty: trimmedSpecialty,
        calendar_id: "primary",
        bio: newDoc.bio,
        avatar_url: defaultAvatar,
        is_active: false,
        working_hours: hoursWithMeta,
      },
      { onConflict: "id" }
    );
  } catch (dbErr) {
    console.warn("Supabase doctor sync notice:", dbErr);
  }

  return newDoc;
}

/**
 * Updates a doctor's verification status (admin decision: approve or reject).
 */
export async function updateDoctorVerificationStatus(
  doctorId: string,
  decision: "approve" | "reject",
  rejectionReason?: string
): Promise<DoctorProfile | null> {
  const doctors = getPersistedDoctors();
  const idx = doctors.findIndex((d) => d.id === doctorId);

  if (idx === -1) return null;

  const doc = doctors[idx];
  const isApproved = decision === "approve";

  doc.verification_status = isApproved ? "approved" : "rejected";
  doc.is_approved = isApproved;
  doc.is_active = isApproved; // Activated only if approved
  doc.rejection_reason = isApproved ? undefined : (rejectionReason || "Credentials did not meet verification criteria.");

  doctors[idx] = { ...doc };
  persistDoctors(doctors);

  // Sync decision to Supabase
  try {
    const supabase = createAdminClient();
    const hoursWithMeta = {
      ...(doc.working_hours || DEFAULT_WORKING_HOURS),
      __verification: {
        email: doc.email,
        clinicRoom: doc.clinicRoom,
        clinicalCode: doc.clinicalCode,
        license_number: doc.license_number,
        qualification_proof: doc.qualification_proof,
        verification_status: doc.verification_status,
        is_approved: doc.is_approved,
        rejection_reason: doc.rejection_reason,
        specialization_study: doc.specialization_study,
        advantages: doc.advantages,
      },
    };

    await supabase
      .from("doctors")
      .update({
        is_active: isApproved,
        working_hours: hoursWithMeta,
      })
      .eq("id", doctorId);
  } catch (dbErr) {
    console.warn("Supabase doctor status update notice:", dbErr);
  }

  return doc;
}
