import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { decryptClinicalText } from "@/lib/encryption";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId");

    // Enforce authentication in production
    if (!user && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized: Please log in to view appointments" }, { status: 401 });
    }

    const effectiveUserId = user?.id || queryUserId || null;

    const admin = createAdminClient();
    let query = admin
      .from("appointments")
      .select("*")
      .order("start_time", { ascending: true });

    if (effectiveUserId) {
      query = query.eq("user_id", effectiveUserId);
    } else {
      // In dev mode when no user is logged in, show recent appointments
      query = query.limit(20);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("User appointments fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }

    // Format and sanitize appointments
    const formatted = (appointments || []).map((appt: any) => {
      let decryptedNotes = "";
      let consultationType: "virtual" | "direct" = appt.meet_link ? "virtual" : "direct";

      if (appt.patient_notes) {
        try {
          decryptedNotes = decryptClinicalText(appt.patient_notes);
          if (decryptedNotes.includes("[MODE: DIRECT]")) {
            consultationType = "direct";
            decryptedNotes = decryptedNotes.replace(/\[MODE:\s*DIRECT\]/i, "").trim();
          } else if (decryptedNotes.includes("[MODE: VIRTUAL]")) {
            consultationType = "virtual";
            decryptedNotes = decryptedNotes.replace(/\[MODE:\s*VIRTUAL\]/i, "").trim();
          }
        } catch {
          decryptedNotes = appt.patient_notes;
        }
      }

      const doctorProfile = CLINIC_DOCTORS.find(
        (d) =>
          d.id === appt.doctor_id ||
          (appt.doctor_name && d.name.toLowerCase().includes(appt.doctor_name.toLowerCase().replace(/^dr\.\s*/i, "").split(" ")[0]))
      );

      let meetLink = appt.meet_link;
      if (consultationType === "virtual") {
        if (!meetLink || !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(meetLink)) {
          meetLink = doctorProfile?.meetLink || process.env.DEFAULT_GOOGLE_MEET_URL || appt.meet_link || "https://meet.google.com/doy-knhq-mva";
        }
      }

      return {
        ...appt,
        consultationType,
        meet_link: consultationType === "virtual" ? meetLink : null,
        clinicRoom: doctorProfile?.clinicRoom || "HealthCare Clinic Center, Examination Room 102",
        decryptedNotes,
        doctorName: appt.doctor_name || doctorProfile?.name || "Attending Physician",
        doctorSpecialty: appt.doctor_specialty || doctorProfile?.specialty || "General Medicine",
      };
    });

    return NextResponse.json({
      success: true,
      appointments: formatted,
    });
  } catch (err: any) {
    console.error("GET /api/appointments exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
