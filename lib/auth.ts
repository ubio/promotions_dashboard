import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clientHome, GOOGLE_CLIENT_ID, isClientPortalPath } from "./client-portal-path";
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

// Client sessions, and internal users previewing a client, leave the internal app.
export async function fencedClientHome(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "client") return clientHome(user.clientId);
  if (user.role === "internal" && (await isPreviewingClient())) {
    return clientHome((await cookies()).get(VIEW_AS_COOKIE)?.value);
  }
  return null;
}

export async function redirectIfPortalUser(): Promise<void> {
  const home = await fencedClientHome();
  if (home) redirect(home);
}

// Internal staff see costs. A Google client, or an internal user previewing Google, does not.
export async function requireGoogleBillingSession(): Promise<{ clientView: boolean }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "internal") {
    const preview = await getPreviewClientId();
    if (!preview) return { clientView: false };
    if (preview === GOOGLE_CLIENT_ID) return { clientView: true };
    redirect(clientHome(preview));
  }

  if (user.clientId === GOOGLE_CLIENT_ID) return { clientView: true };
  redirect(clientHome(user.clientId));
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
    if (user.clientId === GOOGLE_CLIENT_ID) redirect(clientHome(user.clientId));
    return { clientId: user.clientId, previewing: false };
  }

  // Internal users may preview, but only with an explicit selection.
  // Google's client view is the billing page, so the offers portal stays closed.
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (user.role === "internal" && viewAs) {
    if (viewAs === GOOGLE_CLIENT_ID) redirect(clientHome(viewAs));
    return { clientId: viewAs, previewing: true };
  }
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
  const home = await fencedClientHome();
  if (home) redirect(home);
  if (user.role !== "internal") redirect("/login");
  return user;
}
