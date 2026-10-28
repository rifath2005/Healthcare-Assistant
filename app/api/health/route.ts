import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTelemetrySnapshot } from "@/lib/telemetry";

const SERVER_START_TIME = Date.now();

export const dynamic = "force-dynamic";

export async function GET() {
  const telemetry = getTelemetrySnapshot();
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);

  let databaseStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    const supabase = createServerSupabaseClient();
    // Quick probe query
    const { error } = await supabase.from("doctors").select("id").limit(1);
    dbLatencyMs = Date.now() - start;

    if (error && !error.message.includes("placeholder")) {
      databaseStatus = `degraded: ${error.message}`;
    }
  } catch (dbErr) {
    databaseStatus = "offline";
  }

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("Dummy"));

  const responsePayload = {
    status: databaseStatus === "offline" ? "unhealthy" : "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    checks: {
      database: {
        status: databaseStatus,
        latencyMs: dbLatencyMs,
      },
      gemini: {
        configured: isGeminiConfigured,
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      },
    },
    telemetry,
  };

  return NextResponse.json(responsePayload, {
    status: responsePayload.status === "healthy" ? 200 : 503,
  });
}
