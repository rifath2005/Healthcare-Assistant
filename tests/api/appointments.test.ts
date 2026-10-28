import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/appointments/book/route";
import { NextRequest } from "next/server";

// Comprehensive mock of Supabase server client with chainable query builder
vi.mock("@/lib/supabase/server", () => {
  return {
    createServerSupabaseClient: () => {
      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockImplementation(async function (this: any) {
          return {
            data: {
              id: "123e4567-e89b-12d3-a456-426614174000",
              name: "Dr. Elena Rostova",
              specialty: "General Practice",
              calendar_id: "primary",
              full_name: "John Patient",
              email: "patient@example.com",
              status: "confirmed",
              meet_link: "https://meet.google.com/abc-defg-hij",
            },
            error: null,
          };
        }),
      };

      return {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: "123e4567-e89b-12d3-a456-426614174000",
                email: "patient@example.com",
              },
            },
          }),
        },
        from: vi.fn(() => mockQueryBuilder),
      };
    },
  };
});

// Mock Google Calendar and Resend
vi.mock("@/lib/googleCalendar", () => ({
  createCalendarAppointment: async () => ({
    eventId: "gcal_event_123",
    meetLink: "https://meet.google.com/abc-defg-hij",
    startTime: "2026-10-28T10:00:00Z",
    endTime: "2026-10-28T10:30:00Z",
  }),
}));

vi.mock("@/lib/resend", () => ({
  sendAppointmentConfirmation: async () => ({ success: true, id: "email_123" }),
}));

describe("POST /api/appointments/book", () => {
  it("should book an appointment atomically, generate a Google Meet link, and return confirmed status", async () => {
    const payload = {
      doctorId: "123e4567-e89b-12d3-a456-426614174000",
      startTime: "2026-10-28T10:00:00.000Z",
      endTime: "2026-10-28T10:30:00.000Z",
      patientNotes: "Persistent tension headache for 3 days",
      timezone: "America/New_York",
    };

    const req = new NextRequest("http://localhost:3000/api/appointments/book", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.appointment.status).toBe("confirmed");
    expect(body.appointment.meetLink).toContain("meet.google.com");
  });

  it("should reject payload with invalid ISO datetime", async () => {
    const invalidPayload = {
      doctorId: "123e4567-e89b-12d3-a456-426614174000",
      startTime: "not-a-datetime",
      endTime: "not-a-datetime",
    };

    const req = new NextRequest("http://localhost:3000/api/appointments/book", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
