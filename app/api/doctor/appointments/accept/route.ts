import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendDualAppointmentBookingEmails } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";
import { fetchAppointmentWithProfile } from "@/lib/appointmentQuery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, doctorId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
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

    // 1. Fetch appointment details with patient profile using resilient helper
    const appointment = await fetchAppointmentWithProfile(supabase, appointmentId);

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Ensure doctor is only accepting their assigned appointment unless admin
    if (doctor && !doctor.isAdmin && appointment.doctor_id && doctor.id !== appointment.doctor_id) {
      const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === doctor.id);
      const docLastName = doctorProfile?.name?.replace(/^Dr\.\s*/, "").split(",")[0].trim().toLowerCase();
      const isNameMatch = docLastName && appointment.doctor_name?.toLowerCase().includes(docLastName);
      if (!isNameMatch) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to accept appointments for other physicians." },
          { status: 403 }
        );
      }
    }

    // 2. Update status to confirmed
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update appointment status" }, { status: 500 });
    }

    // 3. Dispatch confirmation emails to both patient and doctor
    const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appointment.doctor_id);
    const doctorEmail = doctorProfile?.email || "doctor@healthcare.local";
    const clinicRoom = doctorProfile?.clinicRoom || "HealthCare Clinic Center, Room 102";
    const isVirtual = Boolean(appointment.meet_link);
    const formattedDate = formatAppointmentTime(appointment.start_time);

    await sendDualAppointmentBookingEmails({
      to: appointment.profiles?.email || "",
      patientName: appointment.profiles?.full_name || "Patient",
      patientEmail: appointment.profiles?.email || "",
      doctorName: appointment.doctor_name,
      doctorEmail,
      doctorSpecialty: appointment.doctor_specialty,
      startTime: formattedDate,
      consultationType: isVirtual ? "virtual" : "direct",
      clinicRoom,
      meetLink: appointment.meet_link || undefined,
      notes: "Appointment accepted and confirmed by attending physician.",
    });

    return NextResponse.json({
      success: true,
      message: "Appointment accepted and confirmation emails dispatched",
      appointment: { ...appointment, status: "confirmed" },
    });
  } catch (err: any) {
    console.error("Doctor accept appointment exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
