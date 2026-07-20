import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/session";

const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const { credential } = await req.json().catch(() => ({}));
  if (!credential) {
    return NextResponse.json({ error: "credential is required" }, { status: 400 });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    if (ALLOWED_DOMAINS.length && !ALLOWED_DOMAINS.some((d) => payload.email!.endsWith(`@${d}`))) {
      return NextResponse.json(
        { error: "Access restricted to company accounts" },
        { status: 403 }
      );
    }

    const token = await signSession({
      email: payload.email,
      name: payload.name ?? payload.email,
      picture: payload.picture ?? "",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/google]", err);
    return NextResponse.json({ error: "Token verification failed" }, { status: 401 });
  }
}
