import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Defense in depth for portal pages: the proxy already fences routes by role,
// but every portal page also re-derives the clientId from the session itself.
export async function requireClientSession(): Promise<{ clientId: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "client" || !user.clientId) redirect("/login");
  return { clientId: user.clientId };
}
