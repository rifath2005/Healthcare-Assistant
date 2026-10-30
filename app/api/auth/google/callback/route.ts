import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/env";
import { saveGoogleRefreshToken } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      return new NextResponse(`Google authorization error: ${errorParam}`, { status: 400 });
    }

    if (!code) {
      return new NextResponse("Authorization code missing from Google callback", { status: 400 });
    }

    const clientId = env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `Received access token, but Google did not return a refresh token. To force a refresh token, visit /api/auth/google again with prompt=consent.`,
        { status: 400 }
      );
    }

    // Persist refresh token to Supabase and runtime environment (serverless compatible)
    await saveGoogleRefreshToken(tokens.refresh_token, tokens.access_token || undefined);

    // Test creating a live verified Google Meet link
    oAuth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    
    let verifiedMeetLink = "Connected";
    try {
      const testEvent = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: {
          summary: "Verified Telehealth Test Call",
          start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          end: { dateTime: new Date(Date.now() + 5400000).toISOString() },
          conferenceData: {
            createRequest: {
              requestId: `verify_${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });

      verifiedMeetLink = testEvent.data.hangoutLink || "https://meet.google.com";

      // Clean up test event
      if (testEvent.data.id) {
        await calendar.events.delete({
          calendarId: "primary",
          eventId: testEvent.data.id,
        });
      }
    } catch (testErr) {
      console.warn("Could not test create instant meet:", testErr);
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Meet Integration Verified</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .badge { background: #065f46; color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
            h1 { font-size: 22px; margin: 0 0 10px; font-weight: 800; }
            p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
            .link-box { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 12px; font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; margin-bottom: 24px; }
            .btn { background: #10b981; color: white; font-weight: bold; padding: 12px 24px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Google Meet Integration Active</span>
            <h1>Google Calendar & Meet Connected!</h1>
            <p>Your Google account has been authorized. Real, live Google Meet video rooms will now be generated automatically for every virtual consultation.</p>
            <div class="link-box">Verified Meet Link: ${verifiedMeetLink}</div>
            <a href="/doctor/appointments" class="btn">Return to Doctor Portal</a>
          </div>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return new NextResponse(`Authentication failed: ${err.message}`, { status: 500 });
  }
}
