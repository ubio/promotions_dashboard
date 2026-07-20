// Edge-safe session helpers (used by middleware too — keep free of next/headers).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set");
const key = new TextEncoder().encode(secret);

export interface SessionUser {
  email: string;
  name: string;
  picture: string;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      picture: typeof payload.picture === "string" ? payload.picture : "",
    };
  } catch {
    return null;
  }
}
