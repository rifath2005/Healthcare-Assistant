import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment } from "@/lib/googleCalendar";
import { sendAppointmentCancellation } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, status, reason } = await req.json();

    if (!appointmentId || !status) {
      return NextResponse.json({ error: "Missing appointmentId or status" }, { status: 400 });
    }

    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch existing appointment with patient profile details
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(full_name, email)")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 2. Update status in database
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update appointment status" }, { status: 500 });
    }

    // 3. If doctor cancelled the appointment, clean up Google Calendar and notify patient
    let emailDispatched = false;
    if (status === "cancelled") {
      // 3a. Remove Google Calendar event if one exists
      if (appointment.google_event_id) {
        try {
          await deleteCalendarAppointment("primary", appointment.google_event_id);
        } catch (calErr) {
          console.error("Failed to delete Google Calendar appointment on doctor cancel:", calErr);
        }
      }

      // 3b. Dispatch cancellation notification email to patient
      const patientEmail = appointment.profiles?.email;
      const patientName = appointment.profiles?.full_name || "Patient";
      const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);
      const doctorEmail = doctorProfile?.email;
      const formattedDate = formatAppointmentTime(appointment.start_time);
      const isVirtual = Boolean(appointment.meet_link);

      if (patientEmail) {
        try {
          await sendAppointmentCancellation({
            to: patientEmail,
            patientName,
            patientEmail,
            doctorName: appointment.doctor_name,
            doctorEmail,
            doctorSpecialty: appointment.doctor_specialty,
            startTime: formattedDate,
            consultationType: isVirtual ? "virtual" : "direct",
            cancelledBy: "doctor",
            cancellationReason: reason || "Physician schedule conflict / clinical emergency",
          });
          emailDispatched = true;
        } catch (mailErr) {
          console.error("Failed to send cancellation email to patient:", mailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      status,
      emailDispatched,
      message: status === "cancelled"
        ? "Appointment cancelled and patient notification email dispatched."
        : `Appointment marked as ${status}.`,
    });
  } catch (err: any) {
    console.error("Doctor update status exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
