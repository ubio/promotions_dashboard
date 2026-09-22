import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, VIEW_AS_COOKIE } from "@/lib/auth";
import { getReportClientIds } from "@/lib/reports";

export const dynamic = "force-dynamic";

// Internal-only: start or stop previewing the portal as a client. The role is
// checked server-side, so setting the cookie by hand achieves nothing without
// an internal session.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "internal") {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const requested = req.nextUrl.searchParams.get("clientId");

  if (!requested) {
    const res = NextResponse.redirect(new URL("/", req.url), 303);
    res.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Only real client ids, so the cookie cannot be used to probe the database.
  const known = await getReportClientIds();
  if (!known.includes(requested)) {
    return NextResponse.json({ error: "Unknown client" }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL("/portal", req.url), 303);
  res.cookies.set(VIEW_AS_COOKIE, requested, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
