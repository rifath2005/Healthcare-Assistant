import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendDualAppointmentBookingEmails } from "@/lib/resend";
import { formatAppointmentTime } from "@/lib/timezone";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, doctorId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch appointment details with patient profile
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(full_name, email)")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
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
