import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, status } = await req.json();

    if (!appointmentId || !status) {
      return NextResponse.json({ error: "Missing appointmentId or status" }, { status: 400 });
    }

    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (error) {
      return NextResponse.json({ error: "Failed to update appointment status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("Doctor update status exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
