import { NextRequest, NextResponse } from "next/server";
import { isAuthDisabled, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const dest = isAuthDisabled() ? "/" : "/login";
  const res = NextResponse.redirect(new URL(dest, req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
