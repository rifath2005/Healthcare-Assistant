import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment } from "@/lib/googleCalendar";
import { sendAppointmentCancellation } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { fetchAppointmentWithProfile } from "@/lib/appointmentQuery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId, reason } = body || {};

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch appointment record using resilient helper
    const appointment = await fetchAppointmentWithProfile(adminSupabase, appointmentId);

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Check ownership or admin role
    let isAdmin = false;
    let userFullName = "Patient";
    if (user) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      isAdmin = profile?.role === "admin";
      userFullName = profile?.full_name || userFullName;

      const isOwner =
        appointment.user_id === user.id ||
        !appointment.user_id ||
        (user.email && appointment.profiles?.email === user.email);

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Not your appointment" }, { status: 403 });
      }
    }

    // 2. Remove event from Google Calendar if present
    if (appointment.google_event_id) {
      try {
        await deleteCalendarAppointment("primary", appointment.google_event_id);
      } catch (calErr) {
        console.warn("Failed to remove calendar event on cancel:", calErr);
      }
    }

    // 3. Update status to cancelled in Supabase
    const { error: updateErr } = await adminSupabase
      .from("appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update appointment status" }, { status: 500 });
    }

    // 4. Send cancellation email
    const patientEmail = user?.email || appointment.profiles?.email || "";
    const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);
    const formattedDate = formatAppointmentTime(appointment.start_time);
    const isVirtual = Boolean(appointment.meet_link);

    if (patientEmail) {
      await sendAppointmentCancellation({
        to: patientEmail,
        patientName: userFullName || appointment.profiles?.full_name || "Patient",
        patientEmail,
        doctorName: appointment.doctor_name,
        doctorEmail: doctorProfile?.email,
        doctorSpecialty: appointment.doctor_specialty,
        startTime: formattedDate,
        consultationType: isVirtual ? "virtual" : "direct",
        cancelledBy: "patient",
        cancellationReason: reason || "Cancelled upon patient request via patient portal",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Appointment successfully cancelled and calendar slot released.",
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return NextResponse.json({ error: "Cancellation service error" }, { status: 500 });
  }
}
