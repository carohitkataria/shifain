import { NextResponse } from "next/server";
import { SEEN_COOKIE } from "@/lib/patient-app";

/** The notifications were opened: everything up to now is read on this device. */
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SEEN_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
