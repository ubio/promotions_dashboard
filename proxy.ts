import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

export default async function proxy(req: NextRequest) {
  // Local development escape hatch — never set this in production.
  if (process.env.AUTH_DISABLED === "true") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (!user) {
    const login = new URL("/login", req.url);
    const path = req.nextUrl.pathname + req.nextUrl.search;
    if (path !== "/") login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  const path = req.nextUrl.pathname;

  // Client users are fenced into the portal; internal users stay out of it
  // (the portal would have no clientId to scope by).
  if (user.role === "client" && !path.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  if (user.role === "internal" && path.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except login, the auth endpoints and static assets.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
