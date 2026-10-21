// Read-only daily validation counts for Lens (lens.ubio.dev).
//
// This is the one route that answers without a signed-in user, so it is
// deliberately small: a bearer token, counts only, and a bounded date window.
// proxy.ts lets exactly this path through — see LENS_FEED_PATH there.
//
// With no LENS_FEED_TOKEN set it answers nobody. That is the safe default: a
// deploy that forgets the secret serves nothing rather than serving everyone.
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  earliestFrom,
  getLensValidations,
  isIsoDate,
  todayIso,
  type LensDay,
} from "@/lib/lens-feed";

export const dynamic = "force-dynamic";

function tokenMatches(presented: string): boolean {
  const expected = process.env.LENS_FEED_TOKEN?.trim();
  if (!expected) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so compare sizes first and still run the constant-time compare.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;
  const value = rest.join(" ").trim();
  return value === "" ? null : value;
}

export async function GET(req: NextRequest) {
  if (!process.env.LENS_FEED_TOKEN?.trim()) {
    // Not configured: behave as though the route does not exist.
    return new NextResponse(null, { status: 404 });
  }

  const presented = bearer(req);
  if (!presented || !tokenMatches(presented)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = todayIso();
  const requested = req.nextUrl.searchParams.get("from");
  if (requested !== null && !isIsoDate(requested)) {
    return NextResponse.json({ error: "from must be YYYY-MM-DD" }, { status: 400 });
  }
  const floor = earliestFrom(to);
  const from = requested && requested > floor ? requested : floor;

  let days: LensDay[];
  try {
    days = await getLensValidations(from, to);
  } catch (err) {
    console.error("[GET /api/lens/validations]", err);
    return NextResponse.json({ error: "Feed unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { from, to, days },
    { headers: { "Cache-Control": "no-store" } }
  );
}
