import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";

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

    if (error) {
      console.error("Fetch doctors error:", error);
      return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
    }

    return NextResponse.json({ doctors: doctors || [] });
  } catch (err: any) {
    console.error("Admin doctors GET exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { name, specialty, bio, avatar_url, calendar_id, working_hours, is_active } = body;

    if (!name || !specialty) {
      return NextResponse.json(
        { error: "Doctor name and specialty are required." },
        { status: 400 }
      );
    }

    const defaultAvatar =
      avatar_url && avatar_url.trim()
        ? avatar_url.trim()
        : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300";

    const supabase = createAdminClient();
    const { data: newDoctor, error } = await supabase
      .from("doctors")
      .insert({
        name: name.trim(),
        specialty: specialty.trim(),
        calendar_id: calendar_id?.trim() || "primary",
        bio: bio?.trim() || `Board-certified specialist in ${specialty}.`,
        avatar_url: defaultAvatar,
        working_hours: working_hours || DEFAULT_WORKING_HOURS,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error || !newDoctor) {
      console.error("Error creating doctor:", error);
      return NextResponse.json({ error: error?.message || "Failed to create doctor" }, { status: 500 });
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

export async function PUT(req: NextRequest) {
  try {
    const authError = await requireAdminAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { id, name, specialty, bio, avatar_url, calendar_id, working_hours, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Doctor ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: updatedDoctor, error } = await supabase
      .from("doctors")
      .update({
        name: name?.trim(),
        specialty: specialty?.trim(),
        calendar_id: calendar_id?.trim() || "primary",
        bio: bio?.trim(),
        avatar_url: avatar_url?.trim(),
        working_hours,
        is_active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating doctor:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const supabase = createAdminClient();
    const { error } = await supabase.from("doctors").delete().eq("id", id);

    if (error) {
      console.error("Error deleting doctor:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin doctors DELETE exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
