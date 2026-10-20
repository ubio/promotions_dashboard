// Edge-safe (imported by proxy.ts) — no Node-only imports here.

// The promotions clientId for Google. Their client view is the billing page,
// not the offers portal used by every other client.
export const GOOGLE_CLIENT_ID = "Google";
export const GOOGLE_BILLING_PATH = "/billing/google";

// Where a signed-in client (or an internal user previewing one) is sent.
export function clientHome(clientId: string | undefined): string {
  if (clientId === GOOGLE_CLIENT_ID) return GOOGLE_BILLING_PATH;
  return "/portal";
}

function isRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function pathnameOf(value: string): string {
  const withoutQuery = value.split("?")[0] ?? value;
  return withoutQuery.split("#")[0] ?? withoutQuery;
}

// Promotion clients may only open the overview and offers pages (including offer detail).
export function isClientPortalPath(pathname: string): boolean {
  if (pathname === "/portal") return true;
  if (pathname === "/portal/promotions") return true;
  return /^\/portal\/promotions\/[^/]+$/.test(pathname);
}

// Pages a client session is allowed to open. Google is billing only.
export function isClientAllowedPath(clientId: string | undefined, pathname: string): boolean {
  const path = pathnameOf(pathname);
  if (clientId === GOOGLE_CLIENT_ID) return path === GOOGLE_BILLING_PATH;
  return isClientPortalPath(path);
}

// After sign-in, keep a client on a page they are allowed to open.
export function clientDestination(clientId: string, next: unknown): string {
  if (typeof next === "string" && isRelativePath(next) && isClientAllowedPath(clientId, next)) {
    return next;
  }
  return clientHome(clientId);
}

// Internal sign-in may return to the page that asked for login.
export function safeInternalNext(next: unknown): string {
  if (typeof next === "string" && isRelativePath(next)) return next;
  return "/";
}
