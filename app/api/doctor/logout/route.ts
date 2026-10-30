import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out of clinician portal" });

  res.cookies.set({
    name: "doctor_session",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  res.cookies.set({
    name: "doctor_id",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return res;
}
