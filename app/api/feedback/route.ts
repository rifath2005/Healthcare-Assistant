import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, rating, feedbackText } = body || {};

    if (!rating || ![-1, 1].includes(rating)) {
      return NextResponse.json({ error: "Rating must be 1 or -1" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.from("message_feedback").insert({
      message_id: messageId || null,
      user_id: user?.id || null,
      rating,
      feedback_text: feedbackText || "",
    }).select().single();

    if (error) {
      console.error("Feedback submission error:", error);
      return NextResponse.json({ error: "Failed to store feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (error) {
    console.error("Feedback route error:", error);
    return NextResponse.json({ error: "Feedback processing error" }, { status: 500 });
  }
}
