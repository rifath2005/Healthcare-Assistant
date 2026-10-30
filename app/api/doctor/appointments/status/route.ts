import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteCalendarAppointment } from "@/lib/googleCalendar";
import { sendAppointmentCancellation } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";
import { fetchAppointmentWithProfile } from "@/lib/appointmentQuery";

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

    // Authenticate clinician caller and protect against BOLA
    const doctor = await getAuthenticatedDoctor(req);
    if (!doctor && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Unauthorized: Clinician or administrative authentication required" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch existing appointment with patient profile details using resilient helper
    const appointment = await fetchAppointmentWithProfile(supabase, appointmentId);

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Ensure doctor is only modifying their assigned appointment unless admin
    if (doctor && !doctor.isAdmin && appointment.doctor_id && doctor.id !== appointment.doctor_id) {
      const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === doctor.id);
      const docLastName = doctorProfile?.name?.replace(/^Dr\.\s*/, "").split(",")[0].trim().toLowerCase();
      const isNameMatch = docLastName && appointment.doctor_name?.toLowerCase().includes(docLastName);
      if (!isNameMatch) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to modify appointments for other physicians." },
          { status: 403 }
        );
      }
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

      // 3b. Send professional cancellation email to patient
      const patientEmail = appointment.profiles?.email;
      const patientName = appointment.profiles?.full_name || "Patient";

      if (patientEmail) {
        const formattedDate = formatAppointmentTime(appointment.start_time);
        const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);

        const isVirtual = Boolean(appointment.meet_link);
        try {
          const emailRes = await sendAppointmentCancellation({
            to: patientEmail,
            patientName,
            doctorName: appointment.doctor_name || doctorProfile?.name || "Healthcare Clinic Physician",
            doctorSpecialty: appointment.doctor_specialty || doctorProfile?.specialty || "General Medicine",
            startTime: formattedDate,
            consultationType: isVirtual ? "virtual" : "direct",
            cancelledBy: "doctor",
            cancellationReason: reason || "Unforeseen clinical emergency / schedule adjustment",
          });
          emailDispatched = !!(emailRes && (emailRes as any).id);
        } catch (emailErr) {
          console.error("Failed to dispatch doctor cancellation email to patient:", emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointmentId,
      status,
      emailDispatched,
      message: `Appointment successfully marked as ${status}`,
    });
  } catch (err: any) {
    console.error("Doctor appointment status POST exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
