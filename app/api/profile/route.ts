import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { validatePatientProfileGate } from "@/lib/validationArchitecture";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fallback merge with user_metadata in case database migration hasn't populated columns
    const meta = user.user_metadata || {};
    const mergedProfile = {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || meta.full_name || "",
      health_issues: profile?.health_issues || meta.health_issues || "",
      age: profile?.age || meta.age || null,
      gender: profile?.gender || meta.gender || "",
      medical_history: profile?.medical_history || meta.medical_history || "",
      allergies: profile?.allergies || meta.allergies || "",
      medications: profile?.medications || meta.medications || "",
      is_profile_complete:
        profile?.is_profile_complete === true ||
        meta.is_profile_complete === true ||
        Boolean(profile?.health_issues && profile?.age) ||
        Boolean(meta.health_issues && meta.age),
    };

    return NextResponse.json({ profile: mergedProfile });
  } catch (err: any) {
    console.error("GET profile error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { health_issues, age, gender, medical_history, allergies, medications, full_name } = body;

    // Validate using Patient Profile Gate
    const profileToValidate = {
      health_issues,
      age,
      gender,
      medical_history,
      is_profile_complete: true,
    };

    const gateResult = validatePatientProfileGate(profileToValidate);
    if (!gateResult.isComplete) {
      return NextResponse.json(
        {
          error: gateResult.error,
          missingFields: gateResult.missingFields,
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Update user metadata in Supabase Auth so middleware/session sees it instantly
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        is_profile_complete: true,
        health_issues: health_issues.trim(),
        age: Number(age),
        gender: gender ? gender.trim() : "",
        medical_history: medical_history ? medical_history.trim() : "None reported",
        allergies: allergies ? allergies.trim() : "None",
        medications: medications ? medications.trim() : "None",
        full_name: full_name || user.user_metadata?.full_name || "",
      },
    });

    // 2. Persist to profiles table safely
    const profilePayload: Record<string, any> = {
      id: user.id,
      email: user.email,
      health_issues: health_issues.trim(),
      age: Number(age),
      gender: gender ? gender.trim() : "",
      medical_history: medical_history ? medical_history.trim() : "None reported",
      allergies: allergies ? allergies.trim() : "None",
      medications: medications ? medications.trim() : "None",
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    };

    if (full_name) {
      profilePayload.full_name = full_name;
    }

    // Try upserting all columns; fallback gracefully if some columns are omitted in remote db
    try {
      await adminClient.from("profiles").upsert(profilePayload);
    } catch (upsertErr) {
      console.warn("Profiles table column notice, falling back to core fields:", upsertErr);
      await adminClient.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: full_name || user.user_metadata?.full_name || "",
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Health profile successfully completed and saved.",
      profile: {
        ...profilePayload,
        is_profile_complete: true,
      },
    });
  } catch (err: any) {
    console.error("POST profile exception:", err);
    return NextResponse.json({ error: "Internal server error saving health profile" }, { status: 500 });
  }
}
