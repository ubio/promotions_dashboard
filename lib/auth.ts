import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
