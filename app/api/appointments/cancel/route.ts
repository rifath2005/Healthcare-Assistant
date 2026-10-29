import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment } from "@/lib/googleCalendar";
import { sendAppointmentCancellation } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId } = body || {};

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    // 1. Fetch appointment record
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(email, full_name)")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Check ownership or admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    if (appointment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Not your appointment" }, { status: 403 });
    }

    // 2. Remove event from Google Calendar if present
    if (appointment.google_event_id) {
      await deleteCalendarAppointment("primary", appointment.google_event_id);
    }

    // 3. Update status to cancelled in Supabase
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update appointment status" }, { status: 500 });
    }

    // 4. Send cancellation email
    const patientEmail = user.email || "";
    const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);
    const formattedDate = formatAppointmentTime(appointment.start_time);
    const isVirtual = Boolean(appointment.meet_link);

    await sendAppointmentCancellation({
      to: patientEmail,
      patientName: profile?.full_name || "Patient",
      patientEmail,
      doctorName: appointment.doctor_name,
      doctorEmail: doctorProfile?.email,
      doctorSpecialty: appointment.doctor_specialty,
      startTime: formattedDate,
      consultationType: isVirtual ? "virtual" : "direct",
      cancelledBy: "patient",
      cancellationReason: "Cancelled upon patient request via patient portal",
    });

    return NextResponse.json({
      success: true,
      message: "Appointment successfully cancelled and calendar slot released.",
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return NextResponse.json({ error: "Cancellation service error" }, { status: 500 });
  }
}
