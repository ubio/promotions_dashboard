import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/session";
import { resolveAccess } from "@/lib/clients";

const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

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

    const access = resolveAccess(payload.email);
    if (!access) {
      return NextResponse.json(
        { error: "This account does not have access. Contact your UBIO representative." },
        { status: 403 }
      );
    }

    const token = await signSession({
      email: payload.email,
      name: payload.name ?? payload.email,
      picture: payload.picture ?? "",
      role: access.role,
      clientId: access.role === "client" ? access.clientId : undefined,
    });

    const res = NextResponse.json({ ok: true, role: access.role });
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
