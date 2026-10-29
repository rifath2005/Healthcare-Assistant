import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptClinicalText } from "@/lib/encryption";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");

    const supabase = createAdminClient();

    let query = supabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(full_name, email)")
      .order("start_time", { ascending: true });

    if (doctorId && doctorId !== "all") {
      query = query.eq("doctor_id", doctorId);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("Doctor appointments fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }

    // Decrypt patient notes and format response
    const formatted = (appointments || []).map((appt) => {
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

      // Match clinic room
      const doctorProfile = CLINIC_DOCTORS.find((d) => d.id === appt.doctor_id);

      return {
        ...appt,
        consultationType,
        clinicRoom: doctorProfile?.clinicRoom || "HealthCare Clinic Center, Room 102",
        decryptedNotes,
        patientName: appt.profiles?.full_name || "Patient",
        patientEmail: appt.profiles?.email || "Unknown Email",
      };
    });

    return NextResponse.json({ appointments: formatted });
  } catch (err: any) {
    console.error("Doctor appointments GET exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
