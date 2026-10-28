import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendAppointmentReminder } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET authorization header
    const authHeader = req.headers.get("authorization");
    const secretParam = req.nextUrl.searchParams.get("secret");

    const expectedSecret = env.CRON_SECRET || "default_cron_secret_32_characters_long";
    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` || secretParam === expectedSecret;

    if (!isAuthorized && env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized cron invocation" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 2. Query appointments starting in next 24-25 hours
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const { data: upcomingAppointments, error } = await adminSupabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(email, full_name)")
      .eq("status", "confirmed")
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd);

    if (error) {
      console.error("Cron reminder query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let dispatchedCount = 0;

    for (const appt of upcomingAppointments || []) {
      const patientEmail = (appt.profiles as { email?: string; full_name?: string })?.email;
      const patientName = (appt.profiles as { email?: string; full_name?: string })?.full_name || "Patient";

      if (patientEmail) {
        const formattedDate = formatAppointmentTime(appt.start_time);
        await sendAppointmentReminder({
          to: patientEmail,
          patientName,
          doctorName: appt.doctor_name,
          doctorSpecialty: appt.doctor_specialty,
          startTime: formattedDate,
          meetLink: appt.meet_link,
        });
        dispatchedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: upcomingAppointments?.length || 0,
      dispatched: dispatchedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron reminder execution error:", err);
    return NextResponse.json({ error: "Cron execution failure" }, { status: 500 });
  }
}
