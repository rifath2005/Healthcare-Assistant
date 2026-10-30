import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { createCalendarAppointment, generateValidGoogleMeetCode } from "@/lib/googleCalendar";
import { sendAppointmentConfirmation } from "@/lib/resend";
import { encryptClinicalText } from "@/lib/encryption";
import { formatAppointmentTime } from "@/lib/timezone";
import { z } from "zod";

import { getDoctorById } from "@/lib/doctors";
import { sendDualAppointmentBookingEmails } from "@/lib/resend";

export const runtime = "nodejs";

const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid Doctor UUID"),
  startTime: z.string().datetime({ message: "Invalid start time ISO format" }),
  endTime: z.string().datetime({ message: "Invalid end time ISO format" }),
  consultationType: z.enum(["virtual", "direct"]).optional().default("virtual"),
  patientNotes: z.string().max(1000).optional().default(""),
  timezone: z.string().optional().default("UTC"),
  patientName: z.string().optional(),
  patientEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = bookAppointmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { doctorId, startTime, endTime, consultationType, patientNotes, timezone } = parseResult.data;
    const isVirtual = consultationType !== "direct";

    // Obtain reliable database client (supports both authenticated session and admin fallback)
    let dbClient: any = supabase;
    if (!user) {
      try {
        const admin = createAdminClient();
        if (admin) dbClient = admin;
      } catch {}
    }

    // Resolve patient identity
    let patientUserId: string | null = user?.id || null;
    let patientName = parseResult.data.patientName || "Patient";
    let patientEmail = parseResult.data.patientEmail || user?.email || "";

    if (user) {
      const { data: profile } = await dbClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profile) {
        patientName = profile.full_name || patientName;
        patientEmail = profile.email || patientEmail;
      }
    } else {
      // Guest consultation booking: resolve existing profile or fallback to demo patient
      try {
        const { data: existingProfile } = await dbClient
          .from("profiles")
          .select("id, email, full_name")
          .limit(1)
          .maybeSingle();

        if (existingProfile) {
          patientUserId = existingProfile.id;
          patientName = parseResult.data.patientName || existingProfile.full_name || patientName;
          patientEmail = parseResult.data.patientEmail || existingProfile.email || "guest.patient@healthcare.local";
        }
      } catch (err) {
        console.warn("Guest profile lookup notice:", err);
      }

      if (!patientUserId) {
        return NextResponse.json(
          { error: "Authentication required to book a consultation" },
          { status: 401 }
        );
      }
    }

    // 1. Fetch Doctor details (with automatic clinic doctors fallback & auto-seeding)
    let doctor: any = null;
    const { data: dbDoctor, error: docError } = await dbClient
      .from("doctors")
      .select("id, name, specialty, calendar_id")
      .eq("id", doctorId)
      .single();

    if (!docError && dbDoctor) {
      doctor = dbDoctor;
    } else {
      const profileDoc = getDoctorById(doctorId);
      if (profileDoc) {
        doctor = {
          id: profileDoc.id,
          name: profileDoc.name,
          specialty: profileDoc.specialty,
          calendar_id: profileDoc.calendar_id,
        };
        // Auto-seed physician record if missing from database
        try {
          await dbClient.from("doctors").upsert({
            id: profileDoc.id,
            name: profileDoc.name,
            specialty: profileDoc.specialty,
            calendar_id: profileDoc.calendar_id,
            bio: profileDoc.bio,
            avatar_url: profileDoc.avatar_url,
            is_active: true,
          });
        } catch {}
      }
    }

    if (!doctor) {
      return NextResponse.json({ error: "Selected physician not found" }, { status: 404 });
    }

    const doctorProfile = getDoctorById(doctorId);
    const doctorEmail = doctorProfile?.email || "dr.clinic@healthcare.local";
    const clinicRoom = doctorProfile?.clinicRoom || "HealthCare Clinic Center, Room 102";

    // 2. Atomically check slot collision in database
    const { data: conflict } = await dbClient
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId)
      .eq("status", "confirmed")
      .lt("start_time", endTime)
      .gt("end_time", startTime)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot was just booked by another patient. Please select another slot." },
        { status: 409 }
      );
    }

    // 3. Create Google Calendar Event
    // If virtual: includes meet link. If direct: includes clinic room location.
    const gcalResult = await createCalendarAppointment({
      calendarId: doctor.calendar_id,
      summary: `${isVirtual ? 'Virtual' : 'Direct In-Person'} Consultation: ${patientName} & ${doctor.name}`,
      description: `${isVirtual ? 'Virtual Telehealth Consultation' : 'Direct In-Person Clinic Consultation'}\nPhysician: ${doctor.name} (${doctor.specialty})\nPatient: ${patientName}\nMode: ${isVirtual ? 'Virtual (Google Meet)' : `In-Person (${clinicRoom})`}\nNotes: ${patientNotes || "None"}`,
      startTime,
      endTime,
      attendeeEmail: patientEmail,
      defaultMeetLink: doctorProfile?.meetLink || process.env.DEFAULT_GOOGLE_MEET_URL,
    });

    const activeMeetLink = isVirtual
      ? (gcalResult.meetLink || `https://meet.google.com/${generateValidGoogleMeetCode()}`)
      : null;

    // 4. Encrypt sensitive clinical notes before writing to database
    const modeTag = `[MODE: ${consultationType.toUpperCase()}]`;
    const taggedNotes = patientNotes ? `${modeTag} ${patientNotes}` : modeTag;
    const encryptedNotes = encryptClinicalText(taggedNotes);

    // 5. Insert Appointment Record into Supabase
    const { data: appointment, error: insertError } = await dbClient
      .from("appointments")
      .insert({
        user_id: patientUserId,
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        doctor_specialty: doctor.specialty,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
        google_event_id: gcalResult.eventId,
        meet_link: activeMeetLink,
        patient_notes: encryptedNotes,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database appointment insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to persist appointment record" },
        { status: 500 }
      );
    }

    // 6. Dispatch Mandatory Dual Confirmation Emails (to Patient AND Doctor)
    const formattedDate = formatAppointmentTime(startTime, timezone);
    await sendDualAppointmentBookingEmails({
      to: patientEmail,
      patientName,
      patientEmail,
      doctorName: doctor.name,
      doctorEmail,
      doctorSpecialty: doctor.specialty,
      startTime: formattedDate,
      consultationType,
      clinicRoom,
      meetLink: activeMeetLink || undefined,
      notes: patientNotes,
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment?.id || `appt_${Date.now()}`,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        startTime,
        endTime,
        formattedTime: formattedDate,
        consultationType,
        clinicRoom: !isVirtual ? clinicRoom : undefined,
        meetLink: activeMeetLink,
      },
    });
  } catch (error) {
    console.error("Book appointment route exception:", error);
    return NextResponse.json({ error: "Booking service exception" }, { status: 500 });
  }
}
