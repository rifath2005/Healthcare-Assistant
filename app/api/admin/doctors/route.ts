import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";
import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";
import { validateDoctorApprovalGate } from "@/lib/validationArchitecture";

export const runtime = "nodejs";

const DEFAULT_WORKING_HOURS = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "16:00" },
};

/**
 * Validates that the requesting caller has administrator privileges.
 */
async function requireAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  // 1. Check doctor/admin session cookie
  const doctor = await getAuthenticatedDoctor(req);
  if (doctor?.isAdmin) {
    return null;
  }

  // 2. Check Supabase server session
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!authErr && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        return null;
      }
    }
  } catch {
    // continue to fallback check
  }

  // 3. Dev / test bypass
  if (process.env.NODE_ENV !== "production") {
    const adminHeader = req.headers.get("x-admin-token");
    if (adminHeader === "admin-dev-secret") {
      return null;
    }
  }

  return NextResponse.json(
    { error: "Forbidden: Administrative privileges required to manage physician directory." },
    { status: 403 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && doctors && doctors.length > 0) {
      return NextResponse.json({ doctors });
    }

    // Fallback to clinic physicians
    return NextResponse.json({ doctors: CLINIC_DOCTORS });
  } catch (err: any) {
    console.error("Admin doctors GET exception:", err);
    return NextResponse.json({ doctors: CLINIC_DOCTORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const {
      name,
      specialty,
      bio,
      avatar_url,
      calendar_id,
      working_hours,
      is_active,
      license_number,
      qualification_proof,
      verification_status,
      is_approved,
    } = body;

    // Requirement 3: "Do not store or display incomplete doctor details."
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Doctor name is required." },
        { status: 400 }
      );
    }
    if (!specialty || !specialty.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Doctor specialty is required." },
        { status: 400 }
      );
    }
    if (!license_number || !license_number.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Medical license number is required for doctor verification." },
        { status: 400 }
      );
    }
    if (!qualification_proof || !qualification_proof.trim()) {
      return NextResponse.json(
        { error: "Incomplete details: Proof of qualification (license or certificate) is required." },
        { status: 400 }
      );
    }

    const defaultAvatar =
      avatar_url && avatar_url.trim()
        ? avatar_url.trim()
        : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300";

    const status = verification_status || "approved";
    const approved = is_approved ?? (status === "approved");

    const doctorInsertData = {
      name: name.trim(),
      specialty: specialty.trim(),
      calendar_id: calendar_id?.trim() || "primary",
      bio: bio?.trim() || `Board-certified specialist in ${specialty.trim()}.`,
      avatar_url: defaultAvatar,
      working_hours: working_hours || DEFAULT_WORKING_HOURS,
      is_active: is_active ?? true,
      license_number: license_number.trim(),
      qualification_proof: qualification_proof.trim(),
      verification_status: status,
      is_approved: approved,
    };

    let newDoctor: any = null;

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("doctors")
        .insert(doctorInsertData)
        .select()
        .single();

      if (!error && data) {
        newDoctor = data;
      }
    } catch (dbErr) {
      console.warn("DB insert fallback to in-memory:", dbErr);
    }

    if (!newDoctor) {
      // In-memory mock doctor creation for local/test environments
      const generatedId = `doc-${Date.now()}`;
      newDoctor = {
        id: generatedId,
        ...doctorInsertData,
        clinicRoom: "Room 101 - General Practice Suite",
        clinicalCode: `DR-${name.split(" ").pop()?.toUpperCase() || "DOC"}-01`,
        email: `${name.toLowerCase().replace(/[^a-z]/g, "")}@healthcare.local`,
      };
      CLINIC_DOCTORS.push(newDoctor as DoctorProfile);
    }

    // Auto-compute login credentials for administrative reference
    const lastName = newDoctor.name.split(" ").pop()?.replace(/[^a-zA-Z]/g, "").toUpperCase() || "DOC";
    const clinicalCode = `DR-${lastName}-${newDoctor.id.slice(0, 3)}`;
    const email = `${newDoctor.name.toLowerCase().replace(/[^a-z]/g, "")}@healthcare.local`;

    return NextResponse.json({
      success: true,
      doctor: newDoctor,
      credentials: {
        email,
        clinicalCode,
        password: "Doctor@2026",
      },
    });
  } catch (err: any) {
    console.error("Admin doctors POST exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH handler for Administrator Review:
 * Approves or rejects doctor qualification documents.
 * Requirement 3: "An admin must review those documents and approve or reject each doctor.
 * Doctors without an approved status must not be shown to patients or recommended to them."
 */
export async function PATCH(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { id, action, verification_status, is_approved, rejection_reason } = body;

    if (!id) {
      return NextResponse.json({ error: "Doctor ID is required." }, { status: 400 });
    }

    // Determine target review decision
    const isApproveAction = action === "approve" || verification_status === "approved" || is_approved === true;
    const isRejectAction = action === "reject" || verification_status === "rejected" || is_approved === false;

    if (!isApproveAction && !isRejectAction) {
      return NextResponse.json(
        { error: "Invalid action. Must specify 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // Lookup existing doctor to verify complete details before approving
    const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === id);

    let currentDoc = clinicDoc;
    let supabase: any = null;
    try {
      supabase = createAdminClient();
      const { data } = await supabase.from("doctors").select("*").eq("id", id).single();
      if (data) currentDoc = data;
    } catch {
      // fallback
    }

    if (!currentDoc) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    // If approving, enforce that qualification details are complete
    if (isApproveAction) {
      if (!currentDoc.license_number || !currentDoc.license_number.trim() || !currentDoc.qualification_proof || !currentDoc.qualification_proof.trim()) {
        return NextResponse.json(
          { error: "Cannot approve doctor with incomplete details. Medical license number and proof of qualification documents are required." },
          { status: 400 }
        );
      }
    }

    const updatedFields = isApproveAction
      ? {
          verification_status: "approved" as const,
          is_approved: true,
          rejection_reason: null,
        }
      : {
          verification_status: "rejected" as const,
          is_approved: false,
          rejection_reason: rejection_reason?.trim() || "Submitted qualification documents did not meet credentialing standards.",
        };

    // Update in-memory CLINIC_DOCTORS
    if (clinicDoc) {
      clinicDoc.verification_status = updatedFields.verification_status;
      clinicDoc.is_approved = updatedFields.is_approved;
      clinicDoc.rejection_reason = updatedFields.rejection_reason || undefined;
    }

    // Update Supabase if available
    let updatedDoctor: any = { ...currentDoc, ...updatedFields };
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("doctors")
          .update(updatedFields)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          updatedDoctor = data;
        }
      }
    } catch (err) {
      console.warn("Supabase doctor review update notice:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Doctor credentials successfully ${isApproveAction ? "approved" : "rejected"}.`,
      doctor: updatedDoctor,
    });
  } catch (err: any) {
    console.error("Admin doctors PATCH exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const {
      id,
      name,
      specialty,
      bio,
      avatar_url,
      calendar_id,
      working_hours,
      is_active,
      license_number,
      qualification_proof,
      verification_status,
      is_approved,
      rejection_reason,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Doctor ID is required." }, { status: 400 });
    }

    // Completeness validation: Do not store incomplete details
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Incomplete details: Doctor name cannot be empty." }, { status: 400 });
    }
    if (specialty !== undefined && !specialty.trim()) {
      return NextResponse.json({ error: "Incomplete details: Specialty cannot be empty." }, { status: 400 });
    }
    if (license_number !== undefined && !license_number.trim()) {
      return NextResponse.json({ error: "Incomplete details: License number cannot be empty." }, { status: 400 });
    }
    if (qualification_proof !== undefined && !qualification_proof.trim()) {
      return NextResponse.json({ error: "Incomplete details: Qualification proof cannot be empty." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (name) updatePayload.name = name.trim();
    if (specialty) updatePayload.specialty = specialty.trim();
    if (calendar_id) updatePayload.calendar_id = calendar_id.trim();
    if (bio !== undefined) updatePayload.bio = bio.trim();
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url.trim();
    if (working_hours) updatePayload.working_hours = working_hours;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (license_number !== undefined) updatePayload.license_number = license_number.trim();
    if (qualification_proof !== undefined) updatePayload.qualification_proof = qualification_proof.trim();
    if (verification_status) updatePayload.verification_status = verification_status;
    if (is_approved !== undefined) updatePayload.is_approved = is_approved;
    if (rejection_reason !== undefined) updatePayload.rejection_reason = rejection_reason;

    // Update in-memory clinic doctor
    const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === id);
    if (clinicDoc) {
      Object.assign(clinicDoc, updatePayload);
    }

    let updatedDoctor: any = clinicDoc ? { ...clinicDoc } : { id, ...updatePayload };

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("doctors")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updatedDoctor = data;
      }
    } catch (err) {
      console.warn("DB update failed (using in-memory):", err);
    }

    return NextResponse.json({ success: true, doctor: updatedDoctor });
  } catch (err: any) {
    console.error("Admin doctors PUT exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const idx = CLINIC_DOCTORS.findIndex((d) => d.id === id);
    if (idx !== -1) {
      CLINIC_DOCTORS.splice(idx, 1);
    }

    try {
      const supabase = createAdminClient();
      await supabase.from("doctors").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete failed (in-memory cleared):", err);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin doctors DELETE exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
