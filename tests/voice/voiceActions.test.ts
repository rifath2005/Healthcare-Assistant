import { describe, it, expect } from "vitest";
import {
  detectVoiceAction,
  resolveDoctorFromText,
  resolveSlotTiming,
  isAffirmativeConfirmation,
  isNegativeDecline,
} from "@/lib/voiceActions";

describe("Voice Actions & Confirmation Loop", () => {
  it("detects appointment booking request and identifies cardiologist specialist correctly", () => {
    const spokenText = "Book me an appointment with a cardiologist next Tuesday afternoon";
    const action = detectVoiceAction(spokenText);

    expect(action).not.toBeNull();
    expect(action?.type).toBe("book");
    expect(action?.doctor.name).toContain("Dr. Sarah Lin");
    expect(action?.doctor.specialty).toContain("Cardiology");
    expect(action?.spokenPrompt).toContain("Would you like me to confirm");
  });

  it("detects psychologist specialist for mental wellness spoken request", () => {
    const spokenText = "I need to schedule a consultation with a psychologist for severe anxiety";
    const action = detectVoiceAction(spokenText);

    expect(action).not.toBeNull();
    expect(action?.type).toBe("book");
    expect(action?.doctor.name).toContain("Dr. Marcus Vance");
    expect(action?.doctor.specialty).toContain("Psychologist");
  });

  it("detects dermatologist specialist for skin issues", () => {
    const spokenText = "Can I book a visit with a dermatologist next Friday?";
    const action = detectVoiceAction(spokenText);

    expect(action).not.toBeNull();
    expect(action?.type).toBe("book");
    expect(action?.doctor.name).toContain("Dr. Alex Rivera");
    expect(action?.doctor.specialty).toContain("Dermatology");
  });

  it("detects in-person clinic mode versus virtual mode correctly", () => {
    const directSpoken = "Schedule an in-person clinic visit with Dr. Rostova on Monday at 10 AM";
    const directAction = detectVoiceAction(directSpoken);
    expect(directAction?.consultationType).toBe("direct");

    const virtualSpoken = "Book a virtual telehealth appointment with Dr. Lin tomorrow";
    const virtualAction = detectVoiceAction(virtualSpoken);
    expect(virtualAction?.consultationType).toBe("virtual");
  });

  it("detects rescheduling request with an existing appointment", () => {
    const existingAppts = [
      {
        id: "appt-123",
        doctor_id: "33333333-3333-3333-3333-333333333333",
        doctor_name: "Dr. Sarah Lin, MD",
        status: "confirmed",
        start_time: "2026-11-03T14:00:00Z",
      },
    ];

    const spokenText = "Reschedule my appointment with Dr. Lin to Friday at 10 AM";
    const action = detectVoiceAction(spokenText, existingAppts);

    expect(action).not.toBeNull();
    expect(action?.type).toBe("reschedule");
    expect(action?.doctor.name).toContain("Dr. Sarah Lin");
    expect(action?.appointmentId).toBe("appt-123");
    expect(action?.spokenPrompt).toContain("reschedule");
  });

  it("detects cancellation request with confirmation prompt", () => {
    const existingAppts = [
      {
        id: "appt-456",
        doctor_name: "Dr. Marcus Vance, PsyD",
        status: "confirmed",
        start_time: "2026-11-05T15:00:00Z",
      },
    ];

    const spokenText = "Cancel my appointment with Dr. Vance";
    const action = detectVoiceAction(spokenText, existingAppts);

    expect(action).not.toBeNull();
    expect(action?.type).toBe("cancel");
    expect(action?.doctor.name).toContain("Dr. Marcus Vance");
    expect(action?.spokenPrompt).toContain("Are you sure you want to cancel");
  });

  it("evaluates affirmative voice confirmations correctly", () => {
    const affirmativeSamples = [
      "Yes",
      "Yes please",
      "Confirm",
      "Sure",
      "Go ahead",
      "Book it",
      "Please do",
      "Sounds good",
      "Definitely, confirm it",
    ];

    for (const sample of affirmativeSamples) {
      expect(isAffirmativeConfirmation(sample)).toBe(true);
      expect(isNegativeDecline(sample)).toBe(false);
    }
  });

  it("evaluates negative voice declines and cancellations correctly", () => {
    const negativeSamples = [
      "No",
      "Cancel",
      "Never mind",
      "Don't do that",
      "Wait",
      "Stop",
      "No thanks",
    ];

    for (const sample of negativeSamples) {
      expect(isNegativeDecline(sample)).toBe(true);
      expect(isAffirmativeConfirmation(sample)).toBe(false);
    }
  });

  it("resolves date and time intervals into 30-minute ISO timestamps", () => {
    const slot = resolveSlotTiming("next Tuesday at 2 PM", new Date("2026-10-30T12:00:00Z"));
    expect(slot.startTime).toBeDefined();
    expect(slot.endTime).toBeDefined();

    const startMs = new Date(slot.startTime).getTime();
    const endMs = new Date(slot.endTime).getTime();
    expect(endMs - startMs).toBe(30 * 60 * 1000); // exactly 30 minutes
  });
});
