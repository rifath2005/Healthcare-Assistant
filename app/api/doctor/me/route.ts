import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedDoctor } from "@/lib/doctorAuth";
import { CLINIC_DOCTORS } from "@/lib/doctors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);

    if (!doctor) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Lookup full details from static clinic doctors or return authenticated payload
    const clinicDoc = CLINIC_DOCTORS.find((d) => d.id === doctor.id);
    const doctorData = {
      id: doctor.id,
      name: doctor.name || clinicDoc?.name || "Attending Physician",
      specialty: doctor.specialty || clinicDoc?.specialty || "General Medicine",
      email: doctor.email || clinicDoc?.email || `${doctor.id}@healthcare.local`,
      clinicRoom: clinicDoc?.clinicRoom || "HealthCare Clinic Center, Examination Suite",
      avatar_url: clinicDoc?.avatar_url || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
      bio: clinicDoc?.bio || "Board-certified healthcare specialist.",
      calendar_id: clinicDoc?.calendar_id || "primary",
      clinicalCode: clinicDoc?.clinicalCode || `DR-${doctor.id.slice(0, 4).toUpperCase()}`,
      isAdmin: doctor.isAdmin,
    };

    return NextResponse.json({ doctor: doctorData });
  } catch (err: any) {
    console.error("GET /api/doctor/me exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
