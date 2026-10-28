import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format, parseISO } from "date-fns";

/**
 * Resolves the client's local IANA timezone name.
 */
export function getClientTimezone(): string {
  if (typeof window !== "undefined" && Intl?.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }
  return "UTC";
}

/**
 * Formats a UTC ISO timestamp into a user's localized date and time string.
 */
export function formatAppointmentTime(
  isoDate: string,
  timeZone: string = "UTC",
  formatStr: string = "EEE, MMM d, yyyy 'at' h:mm a (zzz)"
): string {
  try {
    const parsed = typeof isoDate === "string" ? parseISO(isoDate) : isoDate;
    return formatInTimeZone(parsed, timeZone, formatStr);
  } catch {
    return isoDate;
  }
}

/**
 * Converts a slot date and time in a specific timezone to a UTC ISO string.
 */
export function slotToUtcIso(dateStr: string, timeStr: string, timeZone: string): string {
  // Combine date and time, e.g. "2026-10-28 09:30"
  const localDateTimeStr = `${dateStr}T${timeStr}:00`;
  const utcDate = fromZonedTime(localDateTimeStr, timeZone);
  return utcDate.toISOString();
}

/**
 * Checks if a time string is within doctor working hours.
 */
export function isWithinWorkingHours(
  timeStr: string,
  startStr: string = "09:00",
  endStr: string = "17:00"
): boolean {
  return timeStr >= startStr && timeStr < endStr;
}
