import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment, createCalendarAppointment } from "@/lib/googleCalendar";
import { sendAppointmentConfirmation } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";

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
    const { appointmentId, newStartTime, newEndTime, timezone } = body || {};

    if (!appointmentId || !newStartTime || !newEndTime) {
      return NextResponse.json(
        { error: "appointmentId, newStartTime, and newEndTime are required" },
        { status: 400 }
      );
    }

    // 1. Fetch existing appointment
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("*, doctors(calendar_id)")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not your appointment" }, { status: 403 });
    }

    // 2. Check collision on new slot
    const { data: conflict } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", appointment.doctor_id)
      .eq("status", "confirmed")
      .neq("id", appointmentId)
      .lt("start_time", newEndTime)
      .gt("end_time", newStartTime)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json({ error: "Selected slot is already booked" }, { status: 409 });
    }

    // 3. Delete old Google Calendar event
    if (appointment.google_event_id) {
      await deleteCalendarAppointment("primary", appointment.google_event_id);
    }

    // 4. Create new Google Calendar event
    const gcalResult = await createCalendarAppointment({
      calendarId: (appointment.doctors as { calendar_id?: string })?.calendar_id || "primary",
      summary: `Consultation (Rescheduled): ${user.email} & ${appointment.doctor_name}`,
      description: `Rescheduled telehealth consultation with ${appointment.doctor_name}.`,
      startTime: newStartTime,
      endTime: newEndTime,
      attendeeEmail: user.email,
    });

    // 5. Update appointment in Supabase
    const { data: updated, error: updateErr } = await supabase
      .from("appointments")
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        google_event_id: gcalResult.eventId,
        meet_link: gcalResult.meetLink,
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update rescheduled appointment" }, { status: 500 });
    }

    // 6. Send rescheduled confirmation email
    const formattedDate = formatAppointmentTime(newStartTime, timezone);
    await sendAppointmentConfirmation({
      to: user.email || "",
      patientName: "Patient",
      doctorName: appointment.doctor_name,
      doctorSpecialty: appointment.doctor_specialty,
      startTime: formattedDate,
      meetLink: gcalResult.meetLink,
    });

    return NextResponse.json({
      success: true,
      appointment: updated,
    });
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    return NextResponse.json({ error: "Rescheduling error" }, { status: 500 });
  }
}
