// Reporting layer for arbitrary date ranges.
//
// Source is `validationLogs` rather than Michael's pre-aggregated `stats`
// collection: stats keeps only a rolling 30 days of daily buckets plus monthly
// rollups, while reports need any range back to the first run (2026-05-21).
// The collection is small (~3k docs), so aggregating live is cheap.
import type { Document, Filter } from "mongodb";
import { db } from "./mongo";
import { rateFor, clientRates } from "./rates";

type LogDoc = Document & { _id: string };

// Some runs (all errored, ZiffDavis, since 2026-08-28) store a wall-clock
// timestamp in `time` instead of an elapsed duration — a bug in the writing
// service. Anything at or above this bound is not a duration, so it is excluded
// from timing stats rather than poisoning the averages.
export const MAX_PLAUSIBLE_DURATION_MS = 86_400_000;

const plausibleTime = {
  $and: [
    { $gt: ["$time", 0] },
    { $lt: ["$time", MAX_PLAUSIBLE_DURATION_MS] },
  ],
};

function logs() {
  return db().collection<LogDoc>("validationLogs");
}

export type GroupBy = "client" | "merchant" | "day" | "month";
export type Outcome = "passed" | "failed" | "errored";

export interface ReportFilters {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  clientIds?: string[];
  domains?: string[];
  outcome?: Outcome;
  failCode?: string;
  groupBy?: GroupBy;
}

export interface ReportRow {
  key: string;
  runs: number;
  conclusions: number;
  errors: number;
  passed: number;
  failed: number;
  distinctPromotions: number;
  distinctCodes: number;
  totalTimeMs: number;
  timedRuns: number;
  avgTimeMs: number;
  cost: number;
  revenue: number | null;
}

export type ReportTotals = Omit<ReportRow, "key">;

export function dayStartMs(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function dayEndMs(date: string): number {
  return dayStartMs(date) + 86400000;
}

export function shiftDate(date: string, days: number): string {
  return new Date(dayStartMs(date) + days * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayStartMs(to) - dayStartMs(from)) / 86400000) + 1;
}

// The equivalent window immediately before [from, to], for period comparison.
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const span = daysBetween(from, to);
  return { from: shiftDate(from, -span), to: shiftDate(to, -span) };
}

export function buildMatch(f: ReportFilters): Filter<LogDoc> {
  const match: Filter<LogDoc> = {
    createdAt: { $gte: dayStartMs(f.from), $lt: dayEndMs(f.to) },
  };
  if (f.clientIds?.length) match.clientId = { $in: f.clientIds };
  if (f.domains?.length) match.domain = { $in: f.domains };
  if (f.outcome === "passed") match.success = true;
  if (f.outcome === "failed") {
    match.success = false;
    match.reportType = { $ne: "error" };
  }
  if (f.outcome === "errored") match.reportType = "error";
  if (f.failCode) match.failCodes = f.failCode;
  return match;
}

function groupKeyExpr(groupBy: GroupBy): Document | string {
  switch (groupBy) {
    case "merchant":
      return "$domain";
    case "day":
      return { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$createdAt" } } };
    case "month":
      return { $dateToString: { format: "%Y-%m", date: { $toDate: "$createdAt" } } };
    default:
      return "$clientId";
  }
}

interface RawRow {
  _id: { key: string | null; clientId: string | null };
  runs: number;
  conclusions: number;
  errors: number;
  passed: number;
  failed: number;
  promotions: (string | null)[];
  codes: (string | null)[];
  totalTimeMs: number;
  timedRuns: number;
  cost: number;
}

// Grouped by (key, clientId) so per-client revenue rates can be applied before
// rolling the rows up — a day or merchant row can span several clients.
async function rawRows(f: ReportFilters): Promise<RawRow[]> {
  const groupBy = f.groupBy ?? "client";
  return logs()
    .aggregate<RawRow>([
      { $match: buildMatch(f) },
      {
        $group: {
          _id: { key: groupKeyExpr(groupBy), clientId: "$clientId" },
          runs: { $sum: 1 },
          conclusions: { $sum: { $cond: [{ $eq: ["$reportType", "error"] }, 0, 1] } },
          errors: { $sum: { $cond: [{ $eq: ["$reportType", "error"] }, 1, 0] } },
          passed: { $sum: { $cond: ["$success", 1, 0] } },
          failed: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$success", false] }, { $ne: ["$reportType", "error"] }] },
                1,
                0,
              ],
            },
          },
          promotions: { $addToSet: "$promotionId" },
          codes: { $addToSet: "$promotionUniqId" },
          totalTimeMs: { $sum: { $cond: [plausibleTime, "$time", 0] } },
          timedRuns: { $sum: { $cond: [plausibleTime, 1, 0] } },
          cost: { $sum: { $sum: "$llmCosts.totalCost" } },
        },
      },
    ])
    .toArray();
}

function blankRow(key: string): ReportRow & { _promotions: Set<string>; _codes: Set<string> } {
  return {
    key,
    runs: 0,
    conclusions: 0,
    errors: 0,
    passed: 0,
    failed: 0,
    distinctPromotions: 0,
    distinctCodes: 0,
    totalTimeMs: 0,
    timedRuns: 0,
    avgTimeMs: 0,
    cost: 0,
    revenue: null,
    _promotions: new Set<string>(),
    _codes: new Set<string>(),
  };
}

export async function getReport(
  f: ReportFilters
): Promise<{ rows: ReportRow[]; totals: ReportTotals }> {
  const rates = clientRates();
  const raw = await rawRows(f);

  const byKey = new Map<string, ReturnType<typeof blankRow>>();
  const totals = blankRow("__total__");

  for (const r of raw) {
    const key = r._id.key ?? "(unknown)";
    const row = byKey.get(key) ?? blankRow(key);
    const rate = rateFor(r._id.clientId ?? undefined, rates);

    for (const target of [row, totals]) {
      target.runs += r.runs;
      target.conclusions += r.conclusions;
      target.errors += r.errors;
      target.passed += r.passed;
      target.failed += r.failed;
      target.totalTimeMs += r.totalTimeMs;
      target.timedRuns += r.timedRuns;
      target.cost += r.cost;
      for (const p of r.promotions) if (p) target._promotions.add(p);
      for (const c of r.codes) if (c) target._codes.add(c);
      if (rate != null) target.revenue = (target.revenue ?? 0) + r.passed * rate;
    }
    byKey.set(key, row);
  }

  const finish = (row: ReturnType<typeof blankRow>): ReportRow => {
    const { _promotions, _codes, ...rest } = row;
    return {
      ...rest,
      distinctPromotions: _promotions.size,
      distinctCodes: _codes.size,
      avgTimeMs: rest.timedRuns > 0 ? Math.round(rest.totalTimeMs / rest.timedRuns) : 0,
    };
  };

  const rows = [...byKey.values()].map(finish);
  const groupBy = f.groupBy ?? "client";
  rows.sort((a, b) =>
    groupBy === "day" || groupBy === "month" ? a.key.localeCompare(b.key) : b.runs - a.runs
  );

  const totalRow = finish(totals);
  const totalRest: ReportTotals = { ...totalRow, key: undefined } as ReportTotals;
  delete (totalRest as { key?: string }).key;
  return { rows, totals: totalRest };
}

export async function getReportClientIds(): Promise<string[]> {
  return (await logs().distinct("clientId")).filter(Boolean).sort() as string[];
}

export async function getReportDomains(): Promise<string[]> {
  return (await logs().distinct("domain")).filter(Boolean).sort() as string[];
}

export interface ValidationExportRow {
  createdAt: number;
  clientId?: string;
  domain?: string;
  promotionId?: string;
  promotionUniqId?: string;
  success?: boolean;
  reportType?: string;
  failCodes?: string[];
  reasoning?: string;
  time?: number;
  llmCosts?: { totalCost?: number }[];
  screenshot?: string;
  sourceUrl?: string;
  importBundle?: string;
}

// Streamed straight to CSV; capped so a wide range can't exhaust memory.
export async function getValidationsForExport(
  f: ReportFilters,
  limit = 20000
): Promise<ValidationExportRow[]> {
  return logs()
    .find(buildMatch(f))
    .sort({ createdAt: -1 })
    .limit(limit)
    .project({
      createdAt: 1,
      clientId: 1,
      domain: 1,
      promotionId: 1,
      promotionUniqId: 1,
      success: 1,
      reportType: 1,
      failCodes: 1,
      reasoning: 1,
      time: 1,
      llmCosts: 1,
      screenshot: 1,
      sourceUrl: 1,
      importBundle: 1,
    })
    .toArray() as Promise<ValidationExportRow[]>;
}

export const GROUP_BY_VALUES: GroupBy[] = ["client", "merchant", "day", "month"];
export const OUTCOME_VALUES: Outcome[] = ["passed", "failed", "errored"];

function isIsoDate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function listParam(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  const all = (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).map((s) => s.trim());
  const cleaned = all.filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

// Shared by the report page and the CSV endpoints so a download always matches
// exactly what is on screen.
export function parseReportSearch(sp: {
  [key: string]: string | string[] | undefined;
}): Required<Pick<ReportFilters, "from" | "to" | "groupBy">> & ReportFilters {
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" && v !== "" ? v : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const to = isIsoDate(one(sp.to)) ? (one(sp.to) as string) : today;
  const from = isIsoDate(one(sp.from)) ? (one(sp.from) as string) : shiftDate(to, -29);
  const groupByRaw = one(sp.groupBy) as GroupBy | undefined;
  const outcomeRaw = one(sp.outcome) as Outcome | undefined;
  return {
    from: from <= to ? from : to,
    to,
    groupBy: groupByRaw && GROUP_BY_VALUES.includes(groupByRaw) ? groupByRaw : "client",
    clientIds: listParam(sp.clientIds),
    domains: listParam(sp.domains),
    outcome: outcomeRaw && OUTCOME_VALUES.includes(outcomeRaw) ? outcomeRaw : undefined,
    failCode: one(sp.failCode),
  };
}

export function reportQueryString(f: ReportFilters): string {
  const sp = new URLSearchParams();
  sp.set("from", f.from);
  sp.set("to", f.to);
  if (f.groupBy) sp.set("groupBy", f.groupBy);
  if (f.clientIds?.length) sp.set("clientIds", f.clientIds.join(","));
  if (f.domains?.length) sp.set("domains", f.domains.join(","));
  if (f.outcome) sp.set("outcome", f.outcome);
  if (f.failCode) sp.set("failCode", f.failCode);
  return sp.toString();
}


export interface FailCodeCount {
  code: string;
  runs: number;
}

// Why did these runs end up the way they did — the reason breakdown behind a
// Passed / Failed / Errored count.
export async function getFailCodeBreakdown(f: ReportFilters): Promise<FailCodeCount[]> {
  const rows = await logs()
    .aggregate<{ _id: string; runs: number }>([
      { $match: buildMatch(f) },
      { $unwind: "$failCodes" },
      { $group: { _id: "$failCodes", runs: { $sum: 1 } } },
      { $sort: { runs: -1 } },
    ])
    .toArray();
  return rows.filter((r) => r._id).map((r) => ({ code: r._id, runs: r.runs }));
}

export const RUNS_PAGE_SIZE = 50;

export async function getRuns(
  f: ReportFilters,
  page: number
): Promise<{ items: ValidationExportRow[]; total: number; page: number; pages: number }> {
  const match = buildMatch(f);
  const total = await logs().countDocuments(match);
  const pages = Math.max(1, Math.ceil(total / RUNS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const items = (await logs()
    .find(match)
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * RUNS_PAGE_SIZE)
    .limit(RUNS_PAGE_SIZE)
    .toArray()) as unknown as ValidationExportRow[];
  return { items, total, page: safePage, pages };
}

// Narrow the current report filters down to one table row, so a number on the
// report links straight to the runs behind it.
export function drillFilters(
  f: ReportFilters,
  rowKey: string,
  outcome?: Outcome
): ReportFilters {
  const next: ReportFilters = { ...f, outcome: outcome ?? f.outcome };
  switch (f.groupBy ?? "client") {
    case "client":
      next.clientIds = [rowKey];
      break;
    case "merchant":
      next.domains = [rowKey];
      break;
    case "day":
      next.from = rowKey;
      next.to = rowKey;
      break;
    case "month": {
      const start = `${rowKey}-01`;
      const [y, m] = rowKey.split("-").map(Number);
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      next.from = f.from > start ? f.from : start;
      next.to = f.to < end ? f.to : end;
      break;
    }
  }
  return next;
}
