import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { google } from "googleapis";
import readline from "readline";
import fs from "fs";
import path from "path";

const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("❌ Missing GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CALENDAR_CLIENT_SECRET in .env.local");
  process.exit(1);
}

// Support standard redirect URIs
const redirectUri = "http://localhost:3001/api/auth/google/callback";

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ],
});

console.log("\n============================================================");
console.log("🔗 GOOGLE CALENDAR & GOOGLE MEET ONE-TIME AUTHORIZATION");
console.log("============================================================\n");
console.log("Open this URL in your browser to authorize your Google Account:");
console.log("\n" + authUrl + "\n");
console.log("------------------------------------------------------------");
console.log("After signing in, if redirected to localhost, paste the FULL redirected URL or code below:");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nEnter Code or Redirected URL: ", async (input) => {
  rl.close();
  try {
    let code = input.trim();
    if (code.includes("code=")) {
      const url = new URL(code);
      code = url.searchParams.get("code") || code;
    }

    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error("⚠️ No refresh token returned. Try again with prompt=consent.");
      process.exit(1);
    }

    console.log("✅ Received Refresh Token!");

    // Save to .env.local
    const envPath = path.resolve(process.cwd(), ".env.local");
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
      envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("💾 Saved GOOGLE_REFRESH_TOKEN to .env.local");

    // Test real Meet generation
    oAuth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const res = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: "Verified Google Meet Test",
        start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        end: { dateTime: new Date(Date.now() + 5400000).toISOString() },
        conferenceData: {
          createRequest: {
            requestId: "test_" + Date.now(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    console.log("🎉 SUCCESS! Live Google Meet Link Created:");
    console.log("👉", res.data.hangoutLink);

    // Clean up
    if (res.data.id) {
      await calendar.events.delete({ calendarId: "primary", eventId: res.data.id });
    }
  } catch (err: any) {
    console.error("❌ Authorization error:", err.message);
  }
});
