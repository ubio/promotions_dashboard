// Daily validation counts for Lens (lens.ubio.dev), which has no browser
// session and reads this over HTTP with a bearer token.
//
// Counts only. Lens shows "how many validations ran", so nothing else belongs
// in here — no promotions, merchants, costs, reasoning or evidence. Keeping
// the shape this narrow is the point: the route is reachable without a signed
// -in user, so what it can return is what a leaked token would return.
//
// The two clients come from different places on purpose, so that Lens agrees
// with what the dashboard itself shows:
//   Google — `googleDailyStats`, the same source as /billing/google
//   everyone else — `validationLogs`, the same source as /reports
import { GOOGLE_CLIENT_ID } from "./client-portal-path";
import { dayEndMs, dayStartMs } from "./reports";
import { db } from "./mongo";

export interface LensDay {
  day: string;
  clientId: string;
  validations: number;
}

// A cap so a stray `from` cannot ask for the whole history.
export const MAX_FEED_DAYS = 90;

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// The earliest `from` we will serve, so the window stays bounded.
export function earliestFrom(to: string): string {
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (MAX_FEED_DAYS - 1));
  return d.toISOString().slice(0, 10);
}

async function googleDays(from: string, to: string): Promise<LensDay[]> {
  const rows = await db()
    .collection("googleDailyStats")
    .aggregate<{ _id: string; validations: number }>(
      [
        { $match: { clientId: GOOGLE_CLIENT_ID, date: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$date",
            validations: { $sum: { $ifNull: ["$validationsStats.totalValidationsCount", 0] } },
          },
        },
      ],
      { maxTimeMS: 20_000 }
    )
    .toArray();
  return rows.map((r) => ({ day: r._id, clientId: GOOGLE_CLIENT_ID, validations: r.validations }));
}

async function otherClientDays(from: string, to: string): Promise<LensDay[]> {
  const rows = await db()
    .collection("validationLogs")
    .aggregate<{ _id: { day: string; clientId: string | null }; validations: number }>(
      [
        {
          $match: {
            createdAt: { $gte: dayStartMs(from), $lt: dayEndMs(to) },
            clientId: { $ne: GOOGLE_CLIENT_ID },
          },
        },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$createdAt" } } },
              clientId: "$clientId",
            },
            validations: { $sum: 1 },
          },
        },
      ],
      { maxTimeMS: 20_000 }
    )
    .toArray();
  return rows
    .filter((r) => typeof r._id.clientId === "string" && r._id.clientId !== "")
    .map((r) => ({
      day: r._id.day,
      clientId: r._id.clientId as string,
      validations: r.validations,
    }));
}

export async function getLensValidations(from: string, to: string): Promise<LensDay[]> {
  const [google, others] = await Promise.all([googleDays(from, to), otherClientDays(from, to)]);
  return [...google, ...others].sort(
    (a, b) => a.day.localeCompare(b.day) || a.clientId.localeCompare(b.clientId)
  );
}
