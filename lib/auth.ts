import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isClientPortalPath, shouldFenceToPortal } from "./client-portal-path";
import {
  isAuthDisabled,
  localDevUser,
  SESSION_COOKIE,
  VIEW_AS_COOKIE,
  verifySession,
  type SessionUser,
} from "./session";

export { VIEW_AS_COOKIE };

export { isClientPortalPath };

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isAuthDisabled()) return localDevUser();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

async function isPreviewingClient(): Promise<boolean> {
  return Boolean((await cookies()).get(VIEW_AS_COOKIE)?.value);
}

export async function redirectIfPortalUser(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  if (shouldFenceToPortal(user.role, await isPreviewingClient())) {
    redirect("/portal");
  }
}

export interface PortalAccess {
  clientId: string;
  // True when an internal user is previewing rather than a real client.
  previewing: boolean;
}

// Defense in depth for portal pages: the proxy already fences routes by role,
// but every portal page also re-derives the clientId server-side.
export async function requireClientSession(): Promise<PortalAccess> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "client") {
    if (!user.clientId) redirect("/login");
    return { clientId: user.clientId, previewing: false };
  }

  // Internal users may preview, but only with an explicit selection.
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (user.role === "internal" && viewAs) return { clientId: viewAs, previewing: true };
  redirect("/portal/preview");
}

export async function getPreviewClientId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "internal") return null;
  return (await cookies()).get(VIEW_AS_COOKIE)?.value ?? null;
}

export async function requireInternalSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (shouldFenceToPortal(user.role, await isPreviewingClient())) redirect("/portal");
  if (user.role !== "internal") redirect("/login");
  return user;
}
