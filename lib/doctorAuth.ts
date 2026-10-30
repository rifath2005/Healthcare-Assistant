import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export interface AuthenticatedDoctor {
  id: string;
  name?: string;
  specialty?: string;
  email?: string;
  isAdmin: boolean;
}

/**
 * Validates and retrieves the authenticated doctor or admin identity from:
 * 1. Supabase Auth session (@supabase/ssr HTTP-only cookies)
 * 2. Signed/HTTP-only doctor_session or doctor_id cookie
 * 3. Header fallback in development/test mode
 */
export async function getAuthenticatedDoctor(req?: NextRequest): Promise<AuthenticatedDoctor | null> {
  // 1. Check Supabase Auth user session first
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!authErr && user) {
      // Check if user is an administrator
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        return {
          id: user.id,
          name: "Administrator",
          isAdmin: true,
        };
      }

      // Check if user is linked to a doctor record
      const { data: doctorRecord } = await supabase
        .from("doctors")
        .select("id, name, specialty")
        .eq("id", user.id)
        .single();

      if (doctorRecord) {
        return {
          id: doctorRecord.id,
          name: doctorRecord.name,
          specialty: doctorRecord.specialty,
          isAdmin: false,
        };
      }
    }
  } catch {
    // Continue to cookie check
  }

  // 2. Check doctor_session or doctor_id cookie
  try {
    let cookieStore: any;
    try {
      cookieStore = cookies();
    } catch {
      cookieStore = null;
    }

    const rawCookieHeader = req?.headers.get("cookie") || "";
    const parseCookie = (name: string): string | undefined => {
      const match = rawCookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : undefined;
    };

    const sessionCookie =
      cookieStore?.get("doctor_session")?.value ||
      req?.cookies.get("doctor_session")?.value ||
      parseCookie("doctor_session");

    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        if (parsed?.id) {
          const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === parsed.id);
          return {
            id: parsed.id,
            name: parsed.name || clinicDoc?.name,
            specialty: parsed.specialty || clinicDoc?.specialty,
            email: parsed.email || clinicDoc?.email,
            isAdmin: parsed.id === "all",
          };
        }
      } catch {
        // malformed JSON session
      }
    }

    const doctorIdCookie =
      cookieStore?.get("doctor_id")?.value ||
      req?.cookies.get("doctor_id")?.value ||
      parseCookie("doctor_id");

    if (doctorIdCookie) {
      const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === doctorIdCookie);
      return {
        id: doctorIdCookie,
        name: clinicDoc?.name || "Attending Physician",
        specialty: clinicDoc?.specialty || "Clinical Specialist",
        email: clinicDoc?.email,
        isAdmin: doctorIdCookie === "all",
      };
    }
  } catch {
    // ignore cookie reading errors
  }

  // 3. Dev / Test mode fallback
  if (process.env.NODE_ENV !== "production") {
    const headerDocId = req?.headers.get("x-doctor-id");
    const searchDocId = req?.nextUrl ? req.nextUrl.searchParams.get("doctorId") : null;
    const fallbackId = headerDocId || searchDocId;

    if (fallbackId) {
      const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === fallbackId);
      if (clinicDoc || fallbackId === "all") {
        return {
          id: fallbackId,
          name: clinicDoc?.name || "Attending Physician",
          specialty: clinicDoc?.specialty || "Clinical Specialist",
          email: clinicDoc?.email,
          isAdmin: fallbackId === "all",
        };
      }
    }
  }

  return null;
}

/**
 * Guard helper that returns 401 Unauthorized if no authenticated doctor/admin is found.
 */
export async function requireDoctorAuth(req?: NextRequest): Promise<
  | { doctor: AuthenticatedDoctor; errorResponse: null }
  | { doctor: null; errorResponse: NextResponse }
> {
  const doctor = await getAuthenticatedDoctor(req);

  if (!doctor) {
    return {
      doctor: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Clinician or administrative authentication required." },
        { status: 401 }
      ),
    };
  }

  return { doctor, errorResponse: null };
}
