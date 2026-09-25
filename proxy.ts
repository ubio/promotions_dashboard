import { NextRequest, NextResponse } from "next/server";
import { isClientPortalPath, shouldFenceToPortal } from "./lib/client-portal-path";
import {
  isAuthDisabled,
  localDevUser,
  SESSION_COOKIE,
  VIEW_AS_COOKIE,
  verifySession,
} from "./lib/session";

// Files under public/ that must be readable before sign-in. Next skips
// _next/static for us, but not public/, and `config.matcher` below is not
// honoured for proxy.ts the way it was for middleware.ts — the compiled
// bundle contains no trace of it — so the exclusion is made here, where it
// demonstrably runs. Without this the login page loses its typeface.
// `/icon.svg` is Next's own metadata route, not a public/ file, but it is
// requested by the signed-out login page just the same. AUTH_DISABLED hides
// this locally, so both entries are covered by a test rather than by looking.
const PUBLIC_PREFIXES = ["/fonts/", "/icon.svg", "/favicon.ico"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }
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

  const internalViewAsApi = user.role === "internal" && path === "/api/view-as";

  if (shouldFenceToPortal(user.role, previewing)) {
    if (path.startsWith("/api/") && !internalViewAsApi) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }
    if (!isClientPortalPath(path) && !internalViewAsApi) {
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
  // `fonts` is public/: the login page is served signed-out, so fencing the
  // typeface behind auth drops the brand back to Arial on the one page every
  // visitor sees.
  matcher: ["/", "/((?!login|api/auth|fonts|_next/static|_next/image|favicon.ico).*)"],
};
