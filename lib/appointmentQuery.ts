import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resiliently fetches an appointment record by ID with attached patient profile data.
 * Protects against schema differences where foreign key constraint aliases like
 * profiles!appointments_user_id_fkey may fail in PostgREST.
 */
export async function fetchAppointmentWithProfile(
  supabase: SupabaseClient | any,
  appointmentId: string
): Promise<any | null> {
  if (!appointmentId) return null;

  // Attempt 1: Named foreign key constraint alias
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, profiles!appointments_user_id_fkey(full_name, email)")
      .eq("id", appointmentId)
      .single();

    if (!error && data) {
      return data;
    }
  } catch {
    // Fall through to Attempt 2
  }

  // Attempt 2: Generic relationship join
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, profiles(full_name, email)")
      .eq("id", appointmentId)
      .single();

    if (!error && data) {
      return data;
    }
  } catch {
    // Fall through to Attempt 3
  }

  // Attempt 3: Direct standalone appointments query + profile batch lookup
  try {
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return null;
    }

    if (appointment.user_id) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", appointment.user_id)
          .single();

        if (profile) {
          appointment.profiles = profile;
        }
      } catch {
        // profile lookup optional
      }
    }

    return appointment;
  } catch (err) {
    console.error("fetchAppointmentWithProfile exception:", err);
    return null;
  }
}
