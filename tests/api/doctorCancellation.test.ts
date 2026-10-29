import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as doctorStatusPOST } from "@/app/api/doctor/appointments/status/route";
import { NextRequest } from "next/server";

// Mock Supabase admin client
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      update: mockUpdate,
    })),
  }),
}));

// Mock Google Calendar and Resend
const mockDeleteCalendarAppointment = vi.fn().mockResolvedValue(true);
const mockSendAppointmentCancellation = vi.fn().mockResolvedValue({ success: true, id: "email_cancel_123" });

vi.mock("@/lib/googleCalendar", () => ({
  deleteCalendarAppointment: (...args: any[]) => mockDeleteCalendarAppointment(...args),
}));

vi.mock("@/lib/resend", () => ({
  sendAppointmentCancellation: (...args: any[]) => mockSendAppointmentCancellation(...args),
}));

describe("POST /api/doctor/appointments/status (Doctor Cancellation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update appointment to cancelled, delete Google Calendar event, and send email to patient", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "appt-999",
        doctor_id: "123e4567-e89b-12d3-a456-426614174000",
        doctor_name: "Dr. Elena Rostova",
        doctor_specialty: "General Practice",
        start_time: "2026-10-30T10:00:00.000Z",
        end_time: "2026-10-30T10:30:00.000Z",
        meet_link: "https://meet.google.com/gsb-hoxn-zhe",
        google_event_id: "gcal_event_999",
        profiles: {
          full_name: "Rifa Patient",
          email: "rifa@example.com",
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/doctor/appointments/status", {
      method: "POST",
      body: JSON.stringify({
        appointmentId: "appt-999",
        status: "cancelled",
        reason: "Clinical emergency in operating room",
      }),
    });

    const res = await doctorStatusPOST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("cancelled");
    expect(body.emailDispatched).toBe(true);

    // Verify calendar event cleanup
    expect(mockDeleteCalendarAppointment).toHaveBeenCalledWith("primary", "gcal_event_999");

    // Verify patient cancellation email dispatch
    expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "rifa@example.com",
        patientName: "Rifa Patient",
        doctorName: "Dr. Elena Rostova",
        cancelledBy: "doctor",
        cancellationReason: "Clinical emergency in operating room",
      })
    );
  });

  it("should handle in-person cancellation and send email without failing", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "appt-888",
        doctor_id: "123e4567-e89b-12d3-a456-426614174000",
        doctor_name: "Dr. Elena Rostova",
        doctor_specialty: "General Practice",
        start_time: "2026-10-30T14:00:00.000Z",
        end_time: "2026-10-30T14:30:00.000Z",
        meet_link: null,
        google_event_id: null,
        profiles: {
          full_name: "Direct In-Person Patient",
          email: "patient.direct@example.com",
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/doctor/appointments/status", {
      method: "POST",
      body: JSON.stringify({
        appointmentId: "appt-888",
        status: "cancelled",
      }),
    });

    const res = await doctorStatusPOST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("cancelled");
    expect(body.emailDispatched).toBe(true);

    // Calendar delete should not be called since google_event_id is null
    expect(mockDeleteCalendarAppointment).not.toHaveBeenCalled();

    // Patient cancellation email should be called with default reason
    expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "patient.direct@example.com",
        patientName: "Direct In-Person Patient",
        consultationType: "direct",
        cancelledBy: "doctor",
      })
    );
  });
});
