import { createAdminClient } from "@/lib/supabase/server";

export interface DoctorIntegrationRecord {
  provider: string;
  refresh_token: string;
  access_token?: string;
  expires_at?: string;
}

/**
 * Persists Google Calendar refresh tokens to the Supabase database and in-memory process environment.
 * Replaces insecure runtime fs.writeFileSync calls on read-only serverless platforms (Vercel / AWS Lambda).
 */
export async function saveGoogleRefreshToken(refreshToken: string, accessToken?: string): Promise<boolean> {
  if (!refreshToken) return false;

  // 1. Immediately update in-memory runtime environment for the current process
  process.env.GOOGLE_REFRESH_TOKEN = refreshToken;

  // 2. Persist to Supabase database table
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("doctor_integrations")
      .upsert(
        {
          provider: "google_calendar",
          refresh_token: refreshToken,
          access_token: accessToken || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider" }
      );

    if (error) {
      console.warn("Could not upsert into doctor_integrations (table may need migration):", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exception saving doctor integration token to database:", err);
    return false;
  }
}

/**
 * Retrieves the stored Google Calendar refresh token from process env or Supabase.
 */
export async function getGoogleRefreshToken(): Promise<string | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return process.env.GOOGLE_REFRESH_TOKEN;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("doctor_integrations")
      .select("refresh_token")
      .eq("provider", "google_calendar")
      .single();

    if (data?.refresh_token) {
      process.env.GOOGLE_REFRESH_TOKEN = data.refresh_token;
      return data.refresh_token;
    }
  } catch {
    // ignore
  }

  return null;
}
