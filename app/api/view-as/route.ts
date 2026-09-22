import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, VIEW_AS_COOKIE } from "@/lib/auth";
import { getReportClientIds } from "@/lib/reports";

export const dynamic = "force-dynamic";

// The container binds 0.0.0.0:3000, so an absolute URL built from req.url sends
// the browser to an unroutable address once we are behind the ingress (and HSTS
// then upgrades it to https://0.0.0.0:3000). Relative Location headers are valid
// per RFC 7231 and work on any host.
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

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
    const res = redirectTo("/");
    res.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Only real client ids, so the cookie cannot be used to probe the database.
  const known = await getReportClientIds();
  if (!known.includes(requested)) {
    return NextResponse.json({ error: "Unknown client" }, { status: 400 });
  }

  const res = redirectTo("/portal");
  res.cookies.set(VIEW_AS_COOKIE, requested, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
