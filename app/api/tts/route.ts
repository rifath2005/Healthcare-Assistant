import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { getVexylHttpUrl, buildVexylDescription, type VexylLanguageCode, type VexylVoiceStyle } from "@/lib/vexylTtsClient";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = await checkRateLimit(`tts_${ip}`, 40, 60000);
    if (!rateCheck.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { text, lang = "en-IN", style = "warm", speaker, description } = body || {};

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
    }

    const vexylBaseUrl = getVexylHttpUrl();
    const isLocalhost = vexylBaseUrl.includes("127.0.0.1") || vexylBaseUrl.includes("localhost");
    const isServerlessProd = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

    if (isServerlessProd && isLocalhost) {
      return NextResponse.json({
        success: false,
        fallback: "web-speech",
        message: "Using browser Web Speech API for voice synthesis in cloud production.",
      });
    }

    const finalDescription =
      description || buildVexylDescription(lang as VexylLanguageCode, speaker, style as VexylVoiceStyle);

    const apiKey = process.env.VEXYL_TTS_API_KEY || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Dispatch to VEXYL-TTS batch endpoint with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const vexylRes = await fetch(`${vexylBaseUrl}/batch/synthesize`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          text: text.slice(0, 5000),
          lang,
          style,
          description: finalDescription,
        }),
      });

      clearTimeout(timeout);

      if (!vexylRes.ok) {
        return NextResponse.json({
          success: false,
          fallback: "web-speech",
          message: `VEXYL-TTS returned status ${vexylRes.status}`,
        });
      }

      const vexylData = await vexylRes.json();
      return NextResponse.json({
        success: true,
        provider: "vexyl-tts",
        ...vexylData,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      // Fallback cleanly to client-side Web Speech
      return NextResponse.json({
        success: false,
        fallback: "web-speech",
        message: "VEXYL-TTS server unreachable, fallback to browser Web Speech API",
      });
    }
  } catch (error: any) {
    console.error("TTS API route exception:", error);
    return NextResponse.json(
      { success: false, fallback: "web-speech", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const vexylBaseUrl = getVexylHttpUrl();
  const isLocalhost = vexylBaseUrl.includes("127.0.0.1") || vexylBaseUrl.includes("localhost");
  const isServerlessProd = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerlessProd && isLocalhost) {
    return NextResponse.json({
      status: "fallback",
      provider: "web-speech",
      message: "Using browser Web Speech API for voice playback in cloud production.",
    });
  }

  try {
    const res = await fetch(`${vexylBaseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        status: "available",
        provider: "vexyl-tts",
        model: data.model || "ai4bharat/indic-parler-tts",
        languages: data.languages || 22,
      });
    }
  } catch {}

  return NextResponse.json({
    status: "fallback",
    provider: "web-speech",
    message: "VEXYL-TTS server not running locally. Using Web Speech API fallback.",
  });
}
