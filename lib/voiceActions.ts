import { CLINIC_DOCTORS, type DoctorProfile } from "@/lib/doctors";

export interface PendingVoiceAction {
  id: string;
  type: "book" | "reschedule" | "cancel";
  doctor: DoctorProfile;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  dateDisplay: string;
  timeDisplay: string;
  consultationType: "virtual" | "direct";
  appointmentId?: string; // for reschedule or cancel
  spokenPrompt: string;
  patientNotes?: string;
}

export interface VoiceActionResult {
  success: boolean;
  message: string;
  spokenFeedback: string;
  appointment?: any;
}

const AFFIRMATIVE_PATTERNS = [
  /\b(yes|yeah|yep|sure|confirm|please\s+do|book\s+it|go\s+ahead|proceed|sounds?\s+good|do\s+it|absolutely|definitely|yes\s+confirm|yes\s+please)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(no|nope|cancel|never\s*mind|don'?t|stop|wait|abort|decline|no\s+thanks|negative)\b/i,
];

/**
 * Checks whether user utterance is an affirmative confirmation for a pending action.
 */
export function isAffirmativeConfirmation(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  // If it contains a negative phrase first, not affirmative
  if (NEGATIVE_PATTERNS.some((p) => p.test(clean))) {
    return false;
  }
  return AFFIRMATIVE_PATTERNS.some((p) => p.test(clean));
}

/**
 * Checks whether user utterance declines a pending action.
 */
export function isNegativeDecline(text: string): boolean {
  if (!text) return false;
  return NEGATIVE_PATTERNS.some((p) => p.test(text.trim()));
}

/**
 * Matches doctor by name or clinical specialty.
 */
export function resolveDoctorFromText(text: string): DoctorProfile {
  const lower = text.toLowerCase();

  // 1. Direct name matching
  for (const doc of CLINIC_DOCTORS) {
    const lastName = doc.name.split(" ")[1]?.toLowerCase();
    if (lastName && lower.includes(lastName)) {
      return doc;
    }
    if (lower.includes(doc.name.toLowerCase())) {
      return doc;
    }
  }

  // 2. Specialty keyword matching
  if (/\b(cardiolog(y|ist)|heart|chest|hypertension|blood\s+pressure)\b/i.test(lower)) {
    const card = CLINIC_DOCTORS.find((d) => d.id === "33333333-3333-3333-3333-333333333333");
    if (card) return card;
  }

  if (/\b(psycholog(y|ist)|mental|wellness|anxiety|stress|panic|depress(ed|ion)|therap(y|ist))\b/i.test(lower)) {
    const psych = CLINIC_DOCTORS.find((d) => d.id === "22222222-2222-2222-2222-222222222222");
    if (psych) return psych;
  }

  if (/\b(dermatolog(y|ist)|skin|rash|eczema|acne)\b/i.test(lower)) {
    const derm = CLINIC_DOCTORS.find((d) => d.id === "4ed011cc-c663-4573-84e7-4310735b63f9");
    if (derm) return derm;
  }

  // Default to General Practitioner / Internal Medicine
  return CLINIC_DOCTORS[0];
}

/**
 * Parses consultation mode from text (virtual vs direct/in-person).
 */
export function resolveConsultationType(text: string): "virtual" | "direct" {
  if (/\b(in[-\s]?person|clinic|direct|office|visit\s+in\s+person|face\s+to\s+face)\b/i.test(text)) {
    return "direct";
  }
  return "virtual";
}

/**
 * Calculates start and end ISO timestamps from date and time text.
 */
export function resolveSlotTiming(
  text: string,
  referenceDate: Date = new Date()
): {
  startTime: string;
  endTime: string;
  dateDisplay: string;
  timeDisplay: string;
} {
  const lower = text.toLowerCase();
  const targetDate = new Date(referenceDate);

  const dayOfWeekMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // 1. Day resolution
  let foundDay = false;
  for (const [dayName, dayIndex] of Object.entries(dayOfWeekMap)) {
    if (new RegExp(`\\b${dayName}\\b`, "i").test(lower)) {
      foundDay = true;
      const currentDay = targetDate.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      if (lower.includes(`next ${dayName}`) && diff < 7) {
        diff += 7;
      }
      targetDate.setDate(targetDate.getDate() + diff);
      break;
    }
  }

  if (!foundDay) {
    if (/\btomorrow\b/i.test(lower)) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (/\btoday\b/i.test(lower)) {
      // Keep today
    } else {
      // Default to next business day or tomorrow
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  // 2. Time resolution
  let hour = 14; // Default 2:00 PM
  let minute = 0;

  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let parsedHour = parseInt(timeMatch[1], 10);
    const parsedMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === "pm" && parsedHour < 12) parsedHour += 12;
    if (meridiem === "am" && parsedHour === 12) parsedHour = 0;

    // If no meridiem was specified:
    if (!meridiem) {
      if (lower.includes("afternoon") || lower.includes("evening") || parsedHour < 8) {
        if (parsedHour < 12) parsedHour += 12;
      }
    }

    hour = parsedHour;
    minute = parsedMin;
  } else if (/\bmorning\b/i.test(lower)) {
    hour = 10;
    minute = 0;
  } else if (/\bafternoon\b/i.test(lower)) {
    hour = 14;
    minute = 0;
  } else if (/\bevening\b/i.test(lower)) {
    hour = 16;
    minute = 0;
  }

  // Clinic hours clamp: 09:00 - 17:00
  if (hour < 9) hour = 9;
  if (hour >= 17) hour = 16;

  targetDate.setHours(hour, minute, 0, 0);

  const startIso = targetDate.toISOString();
  const endTarget = new Date(targetDate.getTime() + 30 * 60 * 1000); // 30-minute slot
  const endIso = endTarget.toISOString();

  const dateDisplay = targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeDisplay = targetDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    startTime: startIso,
    endTime: endIso,
    dateDisplay,
    timeDisplay,
  };
}

/**
 * Parses user input to detect if it requests booking, rescheduling, or cancellation.
 */
export function detectVoiceAction(
  text: string,
  existingAppointments: any[] = []
): PendingVoiceAction | null {
  const lower = text.toLowerCase();

  const isReschedule = /\b(reschedule|change\s+(my\s+)?(time|appointment|booking)|move\s+(my\s+)?appointment)\b/i.test(lower);
  const isCancel = /\b(cancel\s+(my\s+)?(appointment|booking|consultation)|delete\s+(my\s+)?appointment|drop\s+appointment)\b/i.test(lower);
  const isBooking = /\b(book|schedule|make\s+an?\s+appointment|reserve|see\s+a\s+doctor|consult\s+with)\b/i.test(lower);

  // 1. Reschedule action
  if (isReschedule) {
    const targetAppt = existingAppointments.find((a) => a.status === "confirmed") || existingAppointments[0];
    const doctor = targetAppt?.doctor_id
      ? CLINIC_DOCTORS.find((d) => d.id === targetAppt.doctor_id) || resolveDoctorFromText(text)
      : resolveDoctorFromText(text);

    const timing = resolveSlotTiming(text);
    const consultationType = targetAppt?.meet_link ? "virtual" : "direct";

    const spokenPrompt = `I can reschedule your consultation with ${doctor.name} to ${timing.dateDisplay} at ${timing.timeDisplay}. Do you want me to confirm this reschedule?`;

    return {
      id: `act_${Date.now()}`,
      type: "reschedule",
      doctor,
      startTime: timing.startTime,
      endTime: timing.endTime,
      dateDisplay: timing.dateDisplay,
      timeDisplay: timing.timeDisplay,
      consultationType,
      appointmentId: targetAppt?.id || "pending-appt-id",
      spokenPrompt,
    };
  }

  // 2. Cancellation action
  if (isCancel) {
    const targetAppt = existingAppointments.find((a) => a.status === "confirmed") || existingAppointments[0];
    const doctor = targetAppt?.doctor_name
      ? CLINIC_DOCTORS.find((d) => d.name.toLowerCase().includes(targetAppt.doctor_name.toLowerCase())) || CLINIC_DOCTORS[0]
      : resolveDoctorFromText(text);

    const timing = targetAppt?.start_time
      ? {
          startTime: targetAppt.start_time,
          endTime: targetAppt.end_time || targetAppt.start_time,
          dateDisplay: new Date(targetAppt.start_time).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
          timeDisplay: new Date(targetAppt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        }
      : resolveSlotTiming(text);

    const spokenPrompt = `Are you sure you want to cancel your appointment with ${doctor.name} for ${timing.dateDisplay} at ${timing.timeDisplay}?`;

    return {
      id: `act_${Date.now()}`,
      type: "cancel",
      doctor,
      startTime: timing.startTime,
      endTime: timing.endTime,
      dateDisplay: timing.dateDisplay,
      timeDisplay: timing.timeDisplay,
      consultationType: "virtual",
      appointmentId: targetAppt?.id || "pending-appt-id",
      spokenPrompt,
    };
  }

  // 3. New booking action
  if (isBooking) {
    const doctor = resolveDoctorFromText(text);
    const timing = resolveSlotTiming(text);
    const consultationType = resolveConsultationType(text);

    const modeText = consultationType === "direct" ? "an in-person visit" : "a virtual telehealth visit";
    const spokenPrompt = `I can book ${modeText} with ${doctor.name} for ${timing.dateDisplay} at ${timing.timeDisplay}. Would you like me to confirm this appointment?`;

    return {
      id: `act_${Date.now()}`,
      type: "book",
      doctor,
      startTime: timing.startTime,
      endTime: timing.endTime,
      dateDisplay: timing.dateDisplay,
      timeDisplay: timing.timeDisplay,
      consultationType,
      spokenPrompt,
    };
  }

  return null;
}
