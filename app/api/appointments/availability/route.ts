import { NextRequest, NextResponse } from "next/server";
import { checkFreeBusy } from "@/lib/googleCalendar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    const clientTimezone = searchParams.get("timezone") || "UTC";

    if (!doctorId || !dateStr) {
      return NextResponse.json(
        { error: "Query parameters 'doctorId' and 'date' (YYYY-MM-DD) are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch doctor details
    const { data: doctor, error: docError } = await supabase
      .from("doctors")
      .select("id, name, specialty, working_hours, calendar_id")
      .eq("id", doctorId)
      .single();

    if (docError || !doctor) {
      return NextResponse.json({ error: "Physician not found" }, { status: 404 });
    }

    // 2. Determine day of week
    const targetDate = new Date(`${dateStr}T00:00:00Z`);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[targetDate.getUTCDay()];

    const workingHours = (doctor.working_hours as Record<string, { start: string; end: string }>)?.[dayName];

    if (!workingHours) {
      // Doctor does not work on this day
      return NextResponse.json({ doctor, date: dateStr, slots: [] });
    }

    const { start: workStart, end: workEnd } = workingHours;
    const timeMin = `${dateStr}T${workStart}:00Z`;
    const timeMax = `${dateStr}T${workEnd}:00Z`;

    // 3. Query Google Calendar free/busy
    const busyRanges = await checkFreeBusy(doctor.calendar_id, timeMin, timeMax);

    // 4. Query Supabase for already confirmed appointments
    const { data: existingBookings } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .eq("status", "confirmed")
      .gte("start_time", timeMin)
      .lte("end_time", timeMax);

    // 5. Generate 30-minute intervals
    const [startHour, startMin] = workStart.split(":").map(Number);
    const [endHour, endMin] = workEnd.split(":").map(Number);

    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    const availableSlots: Array<{
      start: string;
      end: string;
      displayTime: string;
    }> = [];

    for (let m = startTotalMin; m + 30 <= endTotalMin; m += 30) {
      const slotHour = Math.floor(m / 60);
      const slotMinute = m % 60;
      const endSlotHour = Math.floor((m + 30) / 60);
      const endSlotMinute = (m + 30) % 60;

      const pad = (n: number) => n.toString().padStart(2, "0");
      const slotStartTime = `${dateStr}T${pad(slotHour)}:${pad(slotMinute)}:00Z`;
      const slotEndTime = `${dateStr}T${pad(endSlotHour)}:${pad(endSlotMinute)}:00Z`;

      const slotStartMs = new Date(slotStartTime).getTime();
      const slotEndMs = new Date(slotEndTime).getTime();

      // Check collision with GCal busy ranges
      const collidesGCal = busyRanges.some((b) => {
        const bStart = new Date(b.start).getTime();
        const bEnd = new Date(b.end).getTime();
        return slotStartMs < bEnd && slotEndMs > bStart;
      });

      // Check collision with DB appointments
      const collidesDB = (existingBookings || []).some((eb) => {
        const ebStart = new Date(eb.start_time).getTime();
        const ebEnd = new Date(eb.end_time).getTime();
        return slotStartMs < ebEnd && slotEndMs > ebStart;
      });

      if (!collidesGCal && !collidesDB) {
        // Format display time
        const period = slotHour >= 12 ? "PM" : "AM";
        const h12 = slotHour % 12 === 0 ? 12 : slotHour % 12;
        const displayTime = `${h12}:${pad(slotMinute)} ${period}`;

        availableSlots.push({
          start: slotStartTime,
          end: slotEndTime,
          displayTime,
        });
      }
    }

    return NextResponse.json({
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
      },
      date: dateStr,
      timezone: clientTimezone,
      slots: availableSlots,
    });
  } catch (error) {
    console.error("Availability API route error:", error);
    return NextResponse.json({ error: "Failed to fetch physician availability" }, { status: 500 });
  }
}
