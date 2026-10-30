import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { decryptClinicalText } from "@/lib/encryption";
import { CLINIC_DOCTORS } from "@/lib/doctors";
import { env } from "@/lib/env";
import { requireDoctorAuth } from "@/lib/doctorAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller and protect against BOLA (Broken Object Level Authorization)
    const { doctor, errorResponse } = await requireDoctorAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const requestedDoctorId = searchParams.get("doctorId");

    // 2. Determine target doctor: Only admins can view clinic-wide ("all") or cross-doctor schedules
    let targetDoctorId = doctor.id;
    if (doctor.isAdmin) {
      targetDoctorId = requestedDoctorId || "all";
    } else {
      // Non-admin doctors can only view their own appointments
      if (requestedDoctorId && requestedDoctorId !== doctor.id && requestedDoctorId !== "all") {
        return NextResponse.json(
          { error: "Forbidden: You are only authorized to access your own clinical appointments." },
          { status: 403 }
        );
      }
      if (requestedDoctorId === "all" && !doctor.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Administrative privileges required to access clinic-wide schedules." },
          { status: 403 }
        );
      }
      targetDoctorId = doctor.id;
    }

    // Use admin client with explicit authorization check and filtered scope
    const supabase = createAdminClient();

    let appointments: any[] = [];
    const docProfile = CLINIC_DOCTORS.find((d) => d.id === targetDoctorId);

    const applyDoctorFilter = (baseQuery: any) => {
      if (targetDoctorId && targetDoctorId !== "all") {
        if (docProfile) {
          const docLastName = docProfile.name.replace(/^Dr\.\s*/, "").split(",")[0].trim();
          return baseQuery.or(`doctor_id.eq.${targetDoctorId},doctor_name.ilike.%${docLastName}%`);
        }
        return baseQuery.eq("doctor_id", targetDoctorId);
      }
      return baseQuery;
    };

    // Attempt 1: Named foreign key constraint alias
    let res = await applyDoctorFilter(
      supabase
        .from("appointments")
        .select("*, profiles!appointments_user_id_fkey(full_name, email)")
        .order("start_time", { ascending: true })
    );

    if (!res.error && res.data) {
      appointments = res.data;
    } else {
      // Attempt 2: Generic relationship join
      res = await applyDoctorFilter(
        supabase
          .from("appointments")
          .select("*, profiles(full_name, email)")
          .order("start_time", { ascending: true })
      );

      if (!res.error && res.data) {
        appointments = res.data;
      } else {
        // Attempt 3: Standalone appointments query + batch profiles lookup
        const res3 = await applyDoctorFilter(
          supabase
            .from("appointments")
            .select("*")
            .order("start_time", { ascending: true })
        );

        if (res3.error) {
          console.error("Doctor appointments fetch error:", res3.error);
          return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
        }

        const rawAppts = res3.data || [];
        const userIds = Array.from(new Set(rawAppts.map((a: any) => a.user_id).filter(Boolean)));
        const profileMap: Record<string, { full_name?: string; email?: string }> = {};

        if (userIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds);

            if (profiles) {
              for (const p of profiles) {
                profileMap[p.id] = { full_name: p.full_name, email: p.email };
              }
            }
          } catch (profErr) {
            console.warn("Profiles lookup notice:", profErr);
          }
        }

        appointments = rawAppts.map((a: any) => ({
          ...a,
          profiles: profileMap[a.user_id] || null,
        }));
      }
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

      let meetLink = appt.meet_link;
      if (consultationType === "virtual") {
        if (!meetLink || !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(meetLink)) {
          meetLink = doctorProfile?.meetLink || process.env.DEFAULT_GOOGLE_MEET_URL || appt.meet_link;
        }
      }

      return {
        ...appt,
        consultationType,
        meet_link: meetLink,
        clinicRoom: doctorProfile?.clinicRoom || "HealthCare Clinic Center, Room 102",
        decryptedNotes,
        patientName: appt.profiles?.full_name || "Patient",
        patientEmail: appt.profiles?.email || "Unknown Email",
      };
    });

    return NextResponse.json({
      appointments: formatted,
      googleCalendarConnected: !!(process.env.GOOGLE_REFRESH_TOKEN || (env as any).GOOGLE_REFRESH_TOKEN),
    });
  } catch (err: any) {
    console.error("Doctor appointments GET exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
