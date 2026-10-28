import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser Client Components.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
