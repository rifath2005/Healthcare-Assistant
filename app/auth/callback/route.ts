import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

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
        process.env.GOOGLE_REFRESH_TOKEN = providerRefreshToken;
        try {
          const fs = await import("fs");
          const path = await import("path");
          const envPath = path.resolve(process.cwd(), ".env.local");
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, "utf-8");
            if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
              envContent = envContent.replace(
                /GOOGLE_REFRESH_TOKEN=.*/g,
                `GOOGLE_REFRESH_TOKEN=${providerRefreshToken}`
              );
            } else {
              envContent += `\nGOOGLE_REFRESH_TOKEN=${providerRefreshToken}\n`;
            }
            fs.writeFileSync(envPath, envContent, "utf-8");
          }
        } catch (fileErr) {
          console.error("Failed to persist GOOGLE_REFRESH_TOKEN:", fileErr);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login with instructions
  return NextResponse.redirect(`${origin}/login?error=OAuth+authentication+failed`);
}
