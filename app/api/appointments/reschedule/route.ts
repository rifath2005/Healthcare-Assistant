import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment, createCalendarAppointment } from "@/lib/googleCalendar";
import { sendDualAppointmentBookingEmails } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { fetchAppointmentWithProfile } from "@/lib/appointmentQuery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, doctorId, newStartTime, newEndTime, timezone } = body || {};

    if (!appointmentId || !newStartTime || !newEndTime) {
      return NextResponse.json(
        { error: "appointmentId, newStartTime, and newEndTime are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch existing appointment with patient profile using resilient helper
    const appointment = await fetchAppointmentWithProfile(adminSupabase, appointmentId);

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 2. Authorization check: Either authenticated patient/admin or matching doctor
    const serverSupabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let isAuthorized = false;
    if (user) {
      if (appointment.user_id === user.id) {
        isAuthorized = true;
      } else {
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin" || profile?.role === "doctor") {
          isAuthorized = true;
        }
      }
    }

    // Also authorize if doctorId matches the appointment's assigned doctor (doctor portal session)
    if (doctorId && appointment.doctor_id === doctorId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to reschedule this appointment" },
        { status: 403 }
      );
    }

    // 3. Check slot collision
    const { data: conflict } = await adminSupabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", appointment.doctor_id)
      .eq("status", "confirmed")
      .neq("id", appointmentId)
      .lt("start_time", newEndTime)
      .gt("end_time", newStartTime)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: "Selected slot is already booked. Please choose another time." },
        { status: 409 }
      );
    }

    // 4. Clean up old Google Calendar event if one exists
    if (appointment.google_event_id) {
      try {
        await deleteCalendarAppointment("primary", appointment.google_event_id);
      } catch (calErr) {
        console.error("Failed to delete previous calendar appointment:", calErr);
      }
    }

    // 5. Determine consultation mode and create new Google Calendar event if virtual
    const isVirtual = Boolean(appointment.meet_link);
    const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);
    const patientEmail = appointment.profiles?.email || user?.email || "";
    const patientName = appointment.profiles?.full_name || "Patient";

    let newEventId: string | null = null;
    let newMeetLink: string | null = null;

    if (isVirtual) {
      try {
        const gcalResult = await createCalendarAppointment({
          calendarId: "primary",
          summary: `Consultation (Rescheduled): ${patientName} & ${appointment.doctor_name}`,
          description: `Rescheduled telehealth consultation with ${appointment.doctor_name}.`,
          startTime: newStartTime,
          endTime: newEndTime,
          attendeeEmail: patientEmail,
        });
        newEventId = gcalResult.eventId;
        newMeetLink = gcalResult.meetLink;
      } catch (gcalErr) {
        console.error("Google Calendar reschedule creation warning:", gcalErr);
        newMeetLink = appointment.meet_link || "https://meet.google.com/gsb-hoxn-zhe";
      }
    }

    // 6. Update appointment in Supabase
    const { data: updated, error: updateErr } = await adminSupabase
      .from("appointments")
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        google_event_id: newEventId,
        meet_link: isVirtual ? newMeetLink : null,
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update rescheduled appointment" }, { status: 500 });
    }

    // 7. Dispatch dual confirmation emails to both patient and doctor
    const formattedDate = formatAppointmentTime(newStartTime, timezone);
    try {
      await sendDualAppointmentBookingEmails({
        to: patientEmail,
        patientName,
        patientEmail,
        doctorName: appointment.doctor_name,
        doctorEmail: doctorProfile?.email,
        doctorSpecialty: appointment.doctor_specialty,
        startTime: formattedDate,
        consultationType: isVirtual ? "virtual" : "direct",
        clinicRoom: doctorProfile?.clinicRoom,
        meetLink: isVirtual ? (newMeetLink || undefined) : undefined,
        notes: "Consultation successfully rescheduled to a new time slot.",
      });
    } catch (mailErr) {
      console.error("Failed to dispatch reschedule emails:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Appointment successfully rescheduled.",
      appointment: updated,
    });
  } catch (error) {
    console.error("Reschedule appointment exception:", error);
    return NextResponse.json({ error: "Rescheduling error" }, { status: 500 });
  }
}
