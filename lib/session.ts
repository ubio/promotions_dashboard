// Edge-safe session helpers (used by middleware too — keep free of next/headers).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

// Lazy so `next build` (no env) can import this module; fails at first use instead.
function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type Role = "internal" | "client";

export interface SessionUser {
  email: string;
  name: string;
  picture: string;
  role: Role;
  // Set only for role "client" — the clientId whose data this user may see.
  clientId?: string;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (typeof payload.email !== "string") return null;
    const role: Role = payload.role === "client" ? "client" : "internal";
    if (role === "client" && typeof payload.clientId !== "string") return null;
    return {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      picture: typeof payload.picture === "string" ? payload.picture : "",
      role,
      clientId: role === "client" ? (payload.clientId as string) : undefined,
    };
  } catch {
    return null;
  }
}
