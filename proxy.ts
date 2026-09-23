import { NextRequest, NextResponse } from "next/server";
import { isClientPortalPath, shouldFenceToPortal } from "./lib/client-portal-path";
import {
  isAuthDisabled,
  localDevUser,
  SESSION_COOKIE,
  VIEW_AS_COOKIE,
  verifySession,
} from "./lib/session";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const previewing = Boolean(req.cookies.get(VIEW_AS_COOKIE)?.value);

  let user = null;
  if (isAuthDisabled()) {
    user = localDevUser();
  } else {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    user = token ? await verifySession(token) : null;
    if (!user) {
      const login = new URL("/login", req.url);
      const fullPath = path + req.nextUrl.search;
      if (fullPath !== "/") login.searchParams.set("next", fullPath);
      return NextResponse.redirect(login);
    }
  }

  if (shouldFenceToPortal(user.role, previewing)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }
    if (!isClientPortalPath(path)) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  // Internal users may enter the portal to preview a client, but only with an
  // explicit selection; without one they are sent to the picker.
  if (user.role === "internal" && path.startsWith("/portal")) {
    if (!previewing && path !== "/portal/preview") {
      return NextResponse.redirect(new URL("/portal/preview", req.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  // Protect everything except login, the auth endpoints and static assets.
  // "/" is listed explicitly — the catch-all group can skip the root path.
  matcher: ["/", "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
