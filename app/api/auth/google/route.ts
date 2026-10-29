import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clientId = env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CALENDAR_CLIENT_SECRET missing in .env.local" },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;
    const isDirect = req.nextUrl.searchParams.get("mode") === "direct";

    if (isDirect) {
      const redirectUri = `${origin}/api/auth/google/callback`;
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ],
      });
      return NextResponse.redirect(authUrl);
    }

    // Default: route through Supabase OAuth whose callback is already registered in Google Cloud Console
    const nextUrl = req.nextUrl.searchParams.get("next") || "/doctor/appointments";
    const supabaseAuthorizeUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`)}&scopes=${encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events")}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(supabaseAuthorizeUrl);
  } catch (error: any) {
    console.error("Google OAuth start error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
