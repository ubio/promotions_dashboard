import { NextResponse } from "next/server";
import { isAuthDisabled, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const dest = isAuthDisabled() ? "/" : "/login";
  // Relative redirect: see the note in app/api/view-as/route.ts.
  const res = new NextResponse(null, { status: 303, headers: { Location: dest } });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
