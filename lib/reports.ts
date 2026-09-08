// Reporting layer for arbitrary date ranges.
//
// Source is `validationLogs` rather than Michael's pre-aggregated `stats`
// collection: stats keeps only a rolling 30 days of daily buckets plus monthly
// rollups, while reports need any range back to the first run (2026-05-21).
// The collection is small (~3k docs), so aggregating live is cheap.
import type { Document, Filter } from "mongodb";
import { db } from "./mongo";
import { rateFor, clientRates } from "./rates";
import { AUTOMATION_FAILURE_FAIL_CODES, CLIENT_FACING_FAIL_CODES } from "./fail-codes";

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

export type GroupBy = "client" | "merchant" | "day" | "month" | "year" | "batch";
export type Outcome = "client_facing" | "automation_issues" | "no_result";

export interface ReportFilters {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  clientIds?: string[];
  domains?: string[];
  outcomes?: Outcome[];
  failCode?: string;
  groupBy?: GroupBy;
}

export interface ReportRow {
  key: string;
  runs: number;
  // A run "succeeds" when it reaches a verdict — valid or invalid both count.
  resolved: number;
  noResult: number;
  valid: number;
  invalid: number;
  // Conclusion the client can act on: a successful run, or a failed conclusion
  // whose fail code is in CLIENT_FACING_FAIL_CODES (same rule as promotions-service).
  clientFacing: number;
  // Run whose fail codes include an automation failure (bot, agent, proxy, …).
  automationIssues: number;
  // Promotions in files actually delivered to the client this window
  // (`clientCsvEvents` promotions-export recordCount).
  sentBack: number;
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
  // Each outcome is a different shape of predicate, so several selected
  // outcomes become an $or rather than merged fields.
  const clauses: Filter<LogDoc>[] = [];
  for (const outcome of f.outcomes ?? []) {
    if (outcome === "client_facing") {
      clauses.push({
        reportType: "conclusion",
        $or: [{ success: true }, { failCodes: { $in: CLIENT_FACING_FAIL_CODES } }],
      });
    }
    if (outcome === "automation_issues") {
      clauses.push({ failCodes: { $in: AUTOMATION_FAILURE_FAIL_CODES } });
    }
    if (outcome === "no_result") clauses.push({ reportType: "error" });
  }
  if (clauses.length === 1) Object.assign(match, clauses[0]);
  else if (clauses.length > 1) match.$or = clauses;
  if (f.failCode) match.failCodes = f.failCode;
  return match;
}

function groupKeyExpr(groupBy: GroupBy, createdAtPath: string, bundlePath: string): Document | string {
  switch (groupBy) {
    case "merchant":
      return "$domain";
    case "day":
      return { $dateToString: { format: "%Y-%m-%d", date: { $toDate: createdAtPath } } };
    case "month":
      return { $dateToString: { format: "%Y-%m", date: { $toDate: createdAtPath } } };
    case "year":
      return { $dateToString: { format: "%Y", date: { $toDate: createdAtPath } } };
    case "batch":
      return { $ifNull: [bundlePath, ""] };
    default:
      return "$clientId";
  }
}

interface RawRow {
  _id: { key: string | null; clientId: string | null };
  runs: number;
  resolved: number;
  noResult: number;
  valid: number;
  invalid: number;
  clientFacing: number;
  automationIssues: number;
  totalTimeMs: number;
  timedRuns: number;
  cost: number;
}

function hasAnyFailCode(codes: string[]): Document {
  return {
    $gt: [{ $size: { $setIntersection: [{ $ifNull: ["$failCodes", []] }, codes] } }, 0],
  };
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
          _id: {
            key: groupKeyExpr(groupBy, "$createdAt", "$importBundle"),
            clientId: "$clientId",
          },
          runs: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$reportType", "error"] }, 0, 1] } },
          noResult: { $sum: { $cond: [{ $eq: ["$reportType", "error"] }, 1, 0] } },
          valid: { $sum: { $cond: ["$success", 1, 0] } },
          invalid: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$success", false] }, { $ne: ["$reportType", "error"] }] },
                1,
                0,
              ],
            },
          },
          clientFacing: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$reportType", "conclusion"] },
                    {
                      $or: [{ $eq: ["$success", true] }, hasAnyFailCode(CLIENT_FACING_FAIL_CODES)],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          automationIssues: {
            $sum: { $cond: [hasAnyFailCode(AUTOMATION_FAILURE_FAIL_CODES), 1, 0] },
          },
          totalTimeMs: { $sum: { $cond: [plausibleTime, "$time", 0] } },
          timedRuns: { $sum: { $cond: [plausibleTime, 1, 0] } },
          cost: { $sum: { $sum: "$llmCosts.totalCost" } },
        },
      },
    ])
    .toArray();
}

function blankRow(key: string): ReportRow {
  return {
    key,
    runs: 0,
    resolved: 0,
    noResult: 0,
    valid: 0,
    invalid: 0,
    clientFacing: 0,
    automationIssues: 0,
    sentBack: 0,
    totalTimeMs: 0,
    timedRuns: 0,
    avgTimeMs: 0,
    cost: 0,
    revenue: null,
  };
}

function finishRow(row: ReportRow): ReportRow {
  return {
    ...row,
    avgTimeMs: row.timedRuns > 0 ? Math.round(row.totalTimeMs / row.timedRuns) : 0,
  };
}

function toTotals(row: ReportRow): ReportTotals {
  return {
    runs: row.runs,
    resolved: row.resolved,
    noResult: row.noResult,
    valid: row.valid,
    invalid: row.invalid,
    clientFacing: row.clientFacing,
    automationIssues: row.automationIssues,
    sentBack: row.sentBack,
    totalTimeMs: row.totalTimeMs,
    timedRuns: row.timedRuns,
    avgTimeMs: row.avgTimeMs,
    cost: row.cost,
    revenue: row.revenue,
  };
}

// Date / client only — export events have no merchant, and outcome filters
// belong to the run grain rather than the delivery file.
function buildExportEventMatch(f: ReportFilters): Filter<LogDoc> {
  const match: Filter<LogDoc> = {
    eventType: "promotions-export",
    createdAt: { $gte: dayStartMs(f.from), $lt: dayEndMs(f.to) },
  };
  if (f.clientIds?.length) match.clientId = { $in: f.clientIds };
  return match;
}

interface ExportedRow {
  _id: string | null;
  sentBack: number;
}

async function exportedRows(f: ReportFilters): Promise<ExportedRow[]> {
  const groupBy = f.groupBy ?? "client";
  // Export files are not tagged with a merchant, so that breakdown only
  // contributes to the period total.
  const keyExpr =
    groupBy === "merchant"
      ? { $literal: "__total__" }
      : groupKeyExpr(groupBy, "$createdAt", "$bundleId");
  return db()
    .collection<LogDoc>("clientCsvEvents")
    .aggregate<ExportedRow>([
      { $match: buildExportEventMatch(f) },
      {
        $group: {
          _id: keyExpr,
          sentBack: { $sum: { $ifNull: ["$recordCount", 0] } },
        },
      },
    ])
    .toArray();
}

export async function getReport(
  f: ReportFilters
): Promise<{ rows: ReportRow[]; totals: ReportTotals }> {
  const rates = clientRates();
  const [raw, exported] = await Promise.all([rawRows(f), exportedRows(f)]);

  const byKey = new Map<string, ReportRow>();
  const totals = blankRow("__total__");

  for (const r of raw) {
    const key = r._id.key ?? "(unknown)";
    const row = byKey.get(key) ?? blankRow(key);
    const rate = rateFor(r._id.clientId ?? undefined, rates);

    for (const target of [row, totals]) {
      target.runs += r.runs;
      target.resolved += r.resolved;
      target.noResult += r.noResult;
      target.valid += r.valid;
      target.invalid += r.invalid;
      target.clientFacing += r.clientFacing;
      target.automationIssues += r.automationIssues;
      target.totalTimeMs += r.totalTimeMs;
      target.timedRuns += r.timedRuns;
      target.cost += r.cost;
      if (rate != null) target.revenue = (target.revenue ?? 0) + r.resolved * rate;
    }
    byKey.set(key, row);
  }

  const attachExportsToRows = (f.groupBy ?? "client") !== "merchant";
  for (const r of exported) {
    totals.sentBack += r.sentBack;
    if (!attachExportsToRows) continue;
    const key = r._id ?? "(unknown)";
    const row = byKey.get(key) ?? blankRow(key);
    row.sentBack += r.sentBack;
    byKey.set(key, row);
  }

  const rows = [...byKey.values()].map(finishRow);
  const groupBy = f.groupBy ?? "client";
  const chronological = groupBy === "day" || groupBy === "month" || groupBy === "year";
  rows.sort((a, b) => (chronological ? a.key.localeCompare(b.key) : b.runs - a.runs));

  return { rows, totals: toTotals(finishRow(totals)) };
}

// Filter options change rarely but are fetched on every render; a short TTL
// keeps auto-applying filters cheap (clientId distinct was the slowest query).
const OPTIONS_TTL_MS = 60_000;
const optionsCache = new Map<string, { at: number; values: string[] }>();

async function distinctCached(field: string): Promise<string[]> {
  const hit = optionsCache.get(field);
  if (hit && Date.now() - hit.at < OPTIONS_TTL_MS) return hit.values;
  const values = (await logs().distinct(field)).filter(Boolean).sort() as string[];
  optionsCache.set(field, { at: Date.now(), values });
  return values;
}

export async function getReportClientIds(): Promise<string[]> {
  return distinctCached("clientId");
}

export async function getReportDomains(): Promise<string[]> {
  return distinctCached("domain");
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

export const GROUP_BY_VALUES: GroupBy[] = ["client", "merchant", "day", "month", "year", "batch"];
export const OUTCOME_VALUES: Outcome[] = ["client_facing", "automation_issues", "no_result"];

// Older links used pass/fail, then valid/invalid. Both map onto the current
// client-facing / automation-issues filter so bookmarked URLs still resolve.
const LEGACY_OUTCOMES: Record<string, Outcome> = {
  passed: "client_facing",
  valid: "client_facing",
  failed: "automation_issues",
  invalid: "automation_issues",
  errored: "no_result",
};

function parseGroupBy(raw: string | undefined): GroupBy {
  for (const value of GROUP_BY_VALUES) {
    if (value === raw) return value;
  }
  return "client";
}

function parseOutcome(raw: string): Outcome | undefined {
  const mapped = LEGACY_OUTCOMES[raw] ?? raw;
  for (const value of OUTCOME_VALUES) {
    if (value === mapped) return value;
  }
  return undefined;
}

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
  const toRaw = one(sp.to);
  const fromRaw = one(sp.from);
  const to = isIsoDate(toRaw) ? toRaw : today;
  const from = isIsoDate(fromRaw) ? fromRaw : shiftDate(to, -29);
  const outcomes: Outcome[] = [];
  for (const raw of listParam(sp.outcomes) ?? listParam(sp.outcome) ?? []) {
    const parsed = parseOutcome(raw);
    if (parsed) outcomes.push(parsed);
  }
  return {
    from: from <= to ? from : to,
    to,
    groupBy: parseGroupBy(one(sp.groupBy)),
    clientIds: listParam(sp.clientIds),
    domains: listParam(sp.domains),
    outcomes,
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
  if (f.outcomes?.length) sp.set("outcomes", f.outcomes.join(","));
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
  const next: ReportFilters = { ...f, outcomes: outcome ? [outcome] : f.outcomes };
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


export interface BatchMeta {
  bundleId: string;
  clientId?: string;
  receivedAt?: number;
  deliveredAt?: number;
  records: number;
}

// Batch timings come from the client CSV events (a batch is received as an
// import file and delivered as an export file); the validation runs themselves
// only carry the bundle id. Instrumentation started 2026-09-03, so older
// batches have runs and cost but no turnaround.
export async function getBatchMeta(bundleIds: string[]): Promise<Map<string, BatchMeta>> {
  const ids = bundleIds.filter(Boolean);
  if (ids.length === 0) return new Map();
  const rows = await db()
    .collection("clientCsvEvents")
    .aggregate<{
      _id: string;
      clientId?: string;
      received?: number | null;
      delivered?: number | null;
      records?: number;
    }>([
      { $match: { bundleId: { $in: ids } } },
      {
        $group: {
          _id: "$bundleId",
          clientId: { $first: "$clientId" },
          received: {
            $min: {
              $cond: [{ $eq: ["$eventType", "client-record-import"] }, "$createdAt", null],
            },
          },
          delivered: {
            $max: {
              $cond: [{ $eq: ["$eventType", "promotions-export"] }, "$createdAt", null],
            },
          },
          records: { $sum: { $ifNull: ["$recordCount", 0] } },
        },
      },
    ])
    .toArray();
  return new Map(
    rows.map((r) => [
      r._id,
      {
        bundleId: r._id,
        clientId: r.clientId,
        receivedAt: r.received ?? undefined,
        deliveredAt: r.delivered ?? undefined,
        records: r.records ?? 0,
      },
    ])
  );
}

export function sortBatchRowsByReceived(
  rows: ReportRow[],
  batchMeta: Map<string, BatchMeta>
): ReportRow[] {
  return [...rows].sort((a, b) => {
    const aReceived = batchMeta.get(a.key)?.receivedAt;
    const bReceived = batchMeta.get(b.key)?.receivedAt;
    if (aReceived == null && bReceived == null) return b.runs - a.runs;
    if (aReceived == null) return 1;
    if (bReceived == null) return -1;
    return bReceived - aReceived;
  });
}

export interface DailyRunSeries {
  date: string;
  clientFacing: number;
  automationIssues: number;
  other: number;
}

export async function getDailySeriesForOverview(f: ReportFilters): Promise<DailyRunSeries[]> {
  const { rows } = await getReport({ ...f, groupBy: "day" });
  const byDate = new Map(rows.map((r) => [r.key, r]));
  const out: DailyRunSeries[] = [];
  for (let d = f.from; d <= f.to; d = shiftDate(d, 1)) {
    const r = byDate.get(d);
    const clientFacing = r?.clientFacing ?? 0;
    const automationIssues = r?.automationIssues ?? 0;
    const runs = r?.runs ?? 0;
    out.push({
      date: d,
      clientFacing,
      automationIssues,
      other: Math.max(0, runs - clientFacing - automationIssues),
    });
  }
  return out;
}
