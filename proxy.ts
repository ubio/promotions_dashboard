import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

export default async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (!user) {
    const login = new URL("/login", req.url);
    const path = req.nextUrl.pathname + req.nextUrl.search;
    if (path !== "/") login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except login, the auth endpoints and static assets.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
