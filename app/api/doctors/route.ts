import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: dbDoctors, error } = await supabase
      .from("doctors")
      .select("id, name, specialty, avatar_url, bio, working_hours, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!error && dbDoctors && dbDoctors.length > 0) {
      return NextResponse.json({ doctors: dbDoctors });
    }

    // Fallback to certified in-memory clinic roster if DB is empty or unreachable
    return NextResponse.json({ doctors: CLINIC_DOCTORS });
  } catch (err) {
    console.warn("Public doctors GET fallback notice:", err);
    return NextResponse.json({ doctors: CLINIC_DOCTORS });
  }
}
