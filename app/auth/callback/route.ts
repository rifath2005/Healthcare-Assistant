import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { saveGoogleRefreshToken } from "@/lib/integrations";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/";
  // Protect against open redirect attacks
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const providerRefreshToken = data.session.provider_refresh_token;
      if (providerRefreshToken) {
        // Persist token in memory and Supabase database without mutating .env.local on serverless
        await saveGoogleRefreshToken(providerRefreshToken);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login with instructions
  return NextResponse.redirect(`${origin}/login?error=OAuth+authentication+failed`);
}
