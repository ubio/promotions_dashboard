import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthDisabled, LOCAL_DEV_USER, SESSION_COOKIE, verifySession, type SessionUser } from "./session";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isAuthDisabled()) return LOCAL_DEV_USER;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Cookie letting an internal user preview the portal as a given client. It is
// only ever honoured for role "internal" — a client cannot set it to reach
// another client's data, because their own clientId always wins below.
export const VIEW_AS_COOKIE = "view_as";

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
  if (!user || user.role !== "internal") redirect("/login");
  return user;
}
