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
  needsModeSelection?: boolean;
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
  /\b(yes|yeah|yep|sure|confirm|please\s+do|book\s+it|go\s+ahead|proceed|sounds?\s+good|do\s+it|absolutely|definitely|yes\s+confirm|yes\s+please|lock\s+(?:that|it)\s+in|lock\s+in|ok|okay|fine|correct)\b/i,
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

  // 1. Direct name matching across full name and constituent parts
  for (const doc of CLINIC_DOCTORS) {
    const cleanName = doc.name.replace(/^Dr\.\s*/i, "").toLowerCase();
    const parts = cleanName.split(/\s+/);
    if (lower.includes(doc.name.toLowerCase()) || lower.includes(cleanName)) {
      return doc;
    }
    for (const part of parts) {
      if (part.length > 2 && lower.includes(part)) {
        return doc;
      }
    }
  }

  // 2. Specialty keyword matching
  if (/\b(cardiolog(?:y|ist)|heart|chest|hypertension|blood\s+pressure)\b/i.test(lower)) {
    const card = CLINIC_DOCTORS.find((d) => d.id === "33333333-3333-3333-3333-333333333333");
    if (card) return card;
  }

  if (/\b(psycholog(?:y|ist)|mental|wellness|anxiety|stress|panic|depress(?:ed|ion)|therap(?:y|ist))\b/i.test(lower)) {
    const psych = CLINIC_DOCTORS.find((d) => d.id === "22222222-2222-2222-2222-222222222222");
    if (psych) return psych;
  }

  if (/\b(dermatolog(?:y|ist)|skin|rash|eczema|acne)\b/i.test(lower)) {
    const derm = CLINIC_DOCTORS.find((d) => d.id === "4ed011cc-c663-4573-84e7-4310735b63f9");
    if (derm) return derm;
  }

  // Default to General Practitioner / Internal Medicine
  return CLINIC_DOCTORS[0];
}

/**
 * Parses consultation mode from text (virtual vs direct/in-person vs unspecified).
 */
export function resolveConsultationType(text: string): "virtual" | "direct" | "unspecified" {
  if (/\b(in[-\s]?person|clinic|direct|office|visit\s+in\s+person|face\s+to\s+face|physical|walk\s+in)\b/i.test(text)) {
    return "direct";
  }
  if (/\b(virtual|video|telehealth|meet|online|remote|google\s+meet|call)\b/i.test(text)) {
    return "virtual";
  }
  return "unspecified";
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

  const monthMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  const dayOfWeekMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  let foundDay = false;

  // 1a. Specific Calendar Month & Day e.g., "November 5th", "Nov 5", "5th of November"
  const monthNamesPattern = Object.keys(monthMap).join("|");
  const monthDayMatch =
    lower.match(new RegExp(`\\b(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i")) ||
    lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNamesPattern})\\b`, "i"));

  if (monthDayMatch) {
    let monthStr = "";
    let dayStr = "";
    if (isNaN(Number(monthDayMatch[1]))) {
      monthStr = monthDayMatch[1];
      dayStr = monthDayMatch[2];
    } else {
      dayStr = monthDayMatch[1];
      monthStr = monthDayMatch[2];
    }

    const monthIndex = monthMap[monthStr.toLowerCase()];
    const dayNum = parseInt(dayStr, 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && monthIndex !== undefined) {
      let targetYear = referenceDate.getFullYear();
      const explicitYearMatch = lower.match(/\b(202[4-9]|203[0-9])\b/);
      if (explicitYearMatch) {
        targetYear = parseInt(explicitYearMatch[1], 10);
      } else {
        const testDate = new Date(targetYear, monthIndex, dayNum);
        // If date already elapsed by more than a day this year, schedule for next year
        if (testDate.getTime() < referenceDate.getTime() - 24 * 3600 * 1000) {
          targetYear += 1;
        }
      }
      targetDate.setFullYear(targetYear, monthIndex, dayNum);
      foundDay = true;
    }
  }

  // 1b. Day of week resolution if not a specific calendar date
  if (!foundDay) {
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
  }

  // 1c. Relative day resolution
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

  // Match explicit time representations: "6:00 PM", "6:00", "6 PM", "at 6", "at 6:30"
  let timeMatch = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (timeMatch) {
    let parsedHour = parseInt(timeMatch[1], 10);
    const parsedMin = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === "pm" && parsedHour < 12) parsedHour += 12;
    if (meridiem === "am" && parsedHour === 12) parsedHour = 0;
    if (!meridiem && (lower.includes("afternoon") || lower.includes("evening") || parsedHour < 8)) {
      if (parsedHour < 12) parsedHour += 12;
    }
    hour = parsedHour;
    minute = parsedMin;
  } else {
    timeMatch = lower.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
      let parsedHour = parseInt(timeMatch[1], 10);
      const meridiem = timeMatch[2].toLowerCase();
      if (meridiem === "pm" && parsedHour < 12) parsedHour += 12;
      if (meridiem === "am" && parsedHour === 12) parsedHour = 0;
      hour = parsedHour;
      minute = 0;
    } else {
      timeMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
      if (timeMatch) {
        let parsedHour = parseInt(timeMatch[1], 10);
        const parsedMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const meridiem = timeMatch[3]?.toLowerCase();
        if (meridiem === "pm" && parsedHour < 12) parsedHour += 12;
        if (meridiem === "am" && parsedHour === 12) parsedHour = 0;
        if (!meridiem && (lower.includes("afternoon") || lower.includes("evening") || parsedHour < 8)) {
          if (parsedHour < 12) parsedHour += 12;
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
        hour = 18; // 6:00 PM
        minute = 0;
      }
    }
  }

  // Clinic consultation hours: 08:00 - 21:00 (8 AM - 9 PM)
  if (hour < 8) hour = 8;
  if (hour > 21) hour = 21;

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

  const isReschedule = /\b(reschedule|change\s+(?:my\s+)?(?:time|appointment|booking)|move\s+(?:my\s+)?appointment)\b/i.test(lower);
  const isCancel = /\b(cancel\s+(?:my\s+)?(?:appointment|booking|consultation)|delete\s+(?:my\s+)?appointment|drop\s+appointment)\b/i.test(lower);
  const isBooking =
    /\b(book|booking|schedule|scheduling|make\s+an?\s+appointment|want\s+an?\s+appointment|need\s+an?\s+appointment|fix\s+an?\s+appointment|get\s+an?\s+appointment|take\s+an?\s+appointment|set\s+up\s+an?\s+appointment|appointment\s+with|reserve|see\s+a\s+doctor|consult\s+with)\b/i.test(lower) ||
    (lower.includes("appointment") && (lower.includes("with") || lower.includes("dr") || lower.includes("doctor")));

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
    const rawConsultationType = resolveConsultationType(text);
    const consultationType = rawConsultationType === "direct" ? "direct" : "virtual";
    const needsModeSelection = rawConsultationType === "unspecified";

    const spokenPrompt = needsModeSelection
      ? `I can schedule an appointment with ${doctor.name} for ${timing.dateDisplay} at ${timing.timeDisplay}. Would you like me to confirm this as a Virtual Video Meet or a Direct In-Person Visit?`
      : `I can book ${consultationType === "direct" ? "an in-person clinic visit" : "a virtual telehealth visit"} with ${doctor.name} for ${timing.dateDisplay} at ${timing.timeDisplay}. Would you like me to confirm this appointment?`;

    return {
      id: `act_${Date.now()}`,
      type: "book",
      doctor,
      startTime: timing.startTime,
      endTime: timing.endTime,
      dateDisplay: timing.dateDisplay,
      timeDisplay: timing.timeDisplay,
      consultationType,
      needsModeSelection,
      spokenPrompt,
    };
  }

  return null;
}

/**
 * Detects if a message (such as an assistant confirmation question) proposes an appointment booking.
 */
export function parseProposedBookingFromText(text: string): PendingVoiceAction | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  const hasBookingProposal =
    (lower.includes("schedule an appointment") ||
      lower.includes("book an appointment") ||
      lower.includes("schedule that appointment") ||
      lower.includes("like to schedule") ||
      lower.includes("lock that in") ||
      lower.includes("confirm, you would like") ||
      lower.includes("confirm this appointment") ||
      lower.includes("virtual video meet or a direct in-person visit") ||
      lower.includes("prefer a virtual video meet")) &&
    CLINIC_DOCTORS.some((d) => {
      const clean = d.name.replace(/^Dr\.\s*/i, "").toLowerCase();
      const parts = clean.split(/\s+/);
      return (
        lower.includes(d.name.toLowerCase()) ||
        lower.includes(clean) ||
        parts.some((p) => p.length > 2 && lower.includes(p))
      );
    });

  if (!hasBookingProposal) return null;

  const doctor = resolveDoctorFromText(text);
  const timing = resolveSlotTiming(text);
  const rawConsultationType = resolveConsultationType(text);
  const consultationType = rawConsultationType === "direct" ? "direct" : "virtual";

  return {
    id: `act_${Date.now()}`,
    type: "book",
    doctor,
    startTime: timing.startTime,
    endTime: timing.endTime,
    dateDisplay: timing.dateDisplay,
    timeDisplay: timing.timeDisplay,
    consultationType,
    spokenPrompt: `Confirmed with ${doctor.name} for ${timing.dateDisplay} at ${timing.timeDisplay}`,
  };
}
