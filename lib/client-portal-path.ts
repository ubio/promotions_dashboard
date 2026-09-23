// Edge-safe (imported by proxy.ts) — no Node-only imports here.

import type { Role } from "./session";

// Client users may only open the overview and offers pages (including offer detail).
export function isClientPortalPath(pathname: string): boolean {
  if (pathname === "/portal") return true;
  if (pathname === "/portal/promotions") return true;
  return /^\/portal\/promotions\/[^/]+$/.test(pathname);
}

// Client sessions, and internal users previewing a client, stay in the portal.
export function shouldFenceToPortal(role: Role | undefined, previewing: boolean): boolean {
  if (role === "client") return true;
  if (role === "internal" && previewing) return true;
  return false;
}
