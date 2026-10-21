import type { Document, Filter } from "mongodb";
import { escapeRegex } from "./format";
import { merchantStatusFields, type MerchantHighlight } from "./merchant-status";
import { db } from "./mongo";
import { PAGE_SIZE, type Paged } from "./queries";
import {
  completePeriodStats,
  last30DateRange,
  type PeriodStatsCounters,
  type StatsPeriod,
  utcToday,
} from "./stats-model";

interface DailyStatDoc {
  _id: string;
  clientId: string;
  merchantId: string;
  merchantDomain: string;
  merchantName?: string;
  date: string;
  finalized?: boolean;
  promotionsStats?: PeriodStatsCounters["promotionsStats"];
  validationsStats?: PeriodStatsCounters["validationsStats"];
}

function statsColl() {
  return db().collection<DailyStatDoc>("ziffDavisDailyStats");
}

export interface ClientPeriodRow extends PeriodStatsCounters {
  clientId: string;
  merchantCount: number;
}

export interface MerchantPeriodRow extends PeriodStatsCounters {
  merchantId: string;
  merchantDomain: string;
  merchantName?: string;
  clientCount: number;
}

export interface DatedPeriodRow extends PeriodStatsCounters {
  date: string;
  finalized?: boolean;
}

export interface MonthlyPeriodRow extends PeriodStatsCounters {
  yearMonth: string;
}

interface FacetResult<T> {
  total: Array<{ n: number }>;
  items: T[];
}

const ACTIVITY_MATCH: Document = {
  $or: [
    { "promotionsStats.receivedPromotions": { $gt: 0 } },
    { "promotionsStats.promotionsExportedToCsv": { $gt: 0 } },
    { "promotionsStats.totalPromotionsCount": { $gt: 0 } },
    { "validationsStats.totalValidationsCount": { $gt: 0 } },
    { "validationsStats.totalValidationsCost": { $gt: 0 } },
  ],
};

function periodSumGroup(): Document {
  const sum = (path: string) => ({ $sum: { $ifNull: [`$${path}`, 0] } });
  return {
    receivedPromotions: sum("promotionsStats.receivedPromotions"),
    promotionsExportedToCsv: sum("promotionsStats.promotionsExportedToCsv"),
    totalPromotionsCount: sum("promotionsStats.totalPromotionsCount"),
    promotionsClientFacingCount: sum("promotionsStats.clientFacingCount"),
    promotionsLeftForDebugCount: sum("promotionsStats.leftForDebugCount"),
    cannotValidateCount: sum("promotionsStats.cannotValidateCount"),
    merchantAutomationIssuesCount: sum("promotionsStats.merchantAutomationIssuesCount"),
    totalValidationsCount: sum("validationsStats.totalValidationsCount"),
    totalValidationsCost: sum("validationsStats.totalValidationsCost"),
    conclusionsCount: sum("validationsStats.conclusionsCount"),
    validationsClientFacingCount: sum("validationsStats.clientFacingCount"),
    validationsLeftForDebugCount: sum("validationsStats.leftForDebugCount"),
    errorsCount: sum("validationsStats.errorsCount"),
    automationFailuresCount: sum("validationsStats.automationFailuresCount"),
    botDetectionValidationCount: sum("validationsStats.botDetectionValidationCount"),
    merchantWebsiteIssuesCount: sum("validationsStats.merchantWebsiteIssuesCount"),
  };
}

function projectNestedCounters(extra: Document = {}): Document {
  return {
    $project: {
      _id: 0,
      ...extra,
      promotionsStats: {
        receivedPromotions: "$receivedPromotions",
        promotionsExportedToCsv: "$promotionsExportedToCsv",
        totalPromotionsCount: "$totalPromotionsCount",
        clientFacingCount: "$promotionsClientFacingCount",
        leftForDebugCount: "$promotionsLeftForDebugCount",
        cannotValidateCount: "$cannotValidateCount",
        merchantAutomationIssuesCount: "$merchantAutomationIssuesCount",
      },
      validationsStats: {
        totalValidationsCount: "$totalValidationsCount",
        totalValidationsCost: "$totalValidationsCost",
        conclusionsCount: "$conclusionsCount",
        clientFacingCount: "$validationsClientFacingCount",
        leftForDebugCount: "$validationsLeftForDebugCount",
        errorsCount: "$errorsCount",
        automationFailuresCount: "$automationFailuresCount",
        botDetectionValidationCount: "$botDetectionValidationCount",
        merchantWebsiteIssuesCount: "$merchantWebsiteIssuesCount",
      },
    },
  };
}

function dateClause(period: StatsPeriod): Document | undefined {
  if (period.granularity === "day") {
    return { date: period.date };
  }
  if (period.granularity === "month") {
    return { date: { $gte: `${period.yearMonth}-01`, $lte: `${period.yearMonth}-31` } };
  }
  return undefined;
}

function scopeStage(match: Filter<DailyStatDoc>, period?: StatsPeriod): Document[] {
  const filter: Document = { ...match };
  const date = period ? dateClause(period) : undefined;
  if (date) Object.assign(filter, date);
  if (Object.keys(filter).length === 0) return [];
  return [{ $match: filter }];
}

function merchantStatusStages(status: MerchantHighlight | undefined): Document[] {
  if (!status) return [];
  const flagsMatch: Document = {};
  for (const [field, value] of Object.entries(merchantStatusFields(status))) {
    flagsMatch[`flags.${field}`] = value;
  }
  return [
    {
      $lookup: {
        from: "merchants",
        localField: "merchantId",
        foreignField: "_id",
        as: "flags",
      },
    },
    { $unwind: { path: "$flags", preserveNullAndEmptyArrays: false } },
    { $match: flagsMatch },
    { $unset: "flags" },
  ];
}

function paginateFacet(sort: Document, page: number): Document {
  const safePage = Math.max(1, page);
  return {
    $facet: {
      total: [{ $count: "n" }],
      items: [{ $sort: sort }, { $skip: (safePage - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }],
    },
  };
}

function pagedFromFacet<T>(result: FacetResult<T> | undefined, page: number): Paged<T> {
  const total = result?.total[0]?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  return { items: result?.items ?? [], total, page: safePage, pages };
}

function hydrateCounters<T extends PeriodStatsCounters>(row: T): T {
  const counters = completePeriodStats(row);
  return { ...row, ...counters };
}

export async function getClientPeriodRows(
  period: StatsPeriod,
  opts: { q?: string; page?: number } = {}
): Promise<Paged<ClientPeriodRow>> {
  const page = opts.page ?? 1;
  const match: Filter<DailyStatDoc> = {};
  if (opts.q) match.clientId = opts.q;
  const pipeline = [
    ...scopeStage(match, period),
    {
      $group: {
        _id: "$clientId",
        merchantIds: { $addToSet: "$merchantId" },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({
      clientId: "$_id",
      merchantCount: { $size: "$merchantIds" },
    }),
    { $match: ACTIVITY_MATCH },
    paginateFacet(
      { "validationsStats.totalValidationsCount": -1, "promotionsStats.receivedPromotions": -1, clientId: 1 },
      page
    ),
  ];
  const [result] = await statsColl().aggregate<FacetResult<ClientPeriodRow>>(pipeline).toArray();
  const paged = pagedFromFacet(result, page);
  return { ...paged, items: paged.items.map(hydrateCounters) };
}

export async function getMerchantPeriodRows(
  period: StatsPeriod,
  opts: { q?: string; page?: number; status?: MerchantHighlight } = {}
): Promise<Paged<MerchantPeriodRow>> {
  const page = opts.page ?? 1;
  const match: Filter<DailyStatDoc> = {};
  if (opts.q) {
    const rx = { $regex: escapeRegex(opts.q), $options: "i" };
    match.$or = [{ merchantDomain: rx }, { merchantName: rx }, { merchantId: opts.q }];
  }
  const pipeline = [
    ...scopeStage(match, period),
    {
      $group: {
        _id: "$merchantId",
        merchantDomain: { $last: "$merchantDomain" },
        merchantName: { $last: "$merchantName" },
        clientIds: { $addToSet: "$clientId" },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({
      merchantId: "$_id",
      merchantDomain: "$merchantDomain",
      merchantName: "$merchantName",
      clientCount: { $size: "$clientIds" },
    }),
    { $match: ACTIVITY_MATCH },
    ...merchantStatusStages(opts.status),
    paginateFacet(
      { "validationsStats.totalValidationsCount": -1, "promotionsStats.receivedPromotions": -1, merchantDomain: 1 },
      page
    ),
  ];
  const [result] = await statsColl().aggregate<FacetResult<MerchantPeriodRow>>(pipeline).toArray();
  const paged = pagedFromFacet(result, page);
  return { ...paged, items: paged.items.map(hydrateCounters) };
}

export async function getPeriodTotals(
  period: StatsPeriod,
  match: Filter<DailyStatDoc> = {}
): Promise<PeriodStatsCounters> {
  const pipeline = [
    ...scopeStage(match, period),
    { $group: { _id: null, ...periodSumGroup() } },
    projectNestedCounters(),
  ];
  const [row] = await statsColl().aggregate<PeriodStatsCounters>(pipeline).toArray();
  return completePeriodStats(row);
}

export async function getDailySeries(
  match: Filter<DailyStatDoc> = {}
): Promise<DatedPeriodRow[]> {
  const { from, to } = last30DateRange();
  const pipeline: Document[] = [
    {
      $match: {
        ...match,
        date: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: "$date",
        finalized: { $min: { $cond: [{ $eq: ["$finalized", true] }, 1, 0] } },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({
      date: "$_id",
      finalized: { $eq: ["$finalized", 1] },
    }),
    { $sort: { date: 1 } },
  ];
  const rows = await statsColl().aggregate<DatedPeriodRow>(pipeline).toArray();
  const byDate = new Map(rows.map((row) => [row.date, hydrateCounters(row)]));
  const series: DatedPeriodRow[] = [];
  for (let i = 0; i < 30; i++) {
    const date = addDays(from, i);
    series.push(byDate.get(date) ?? { date, ...completePeriodStats() });
  }
  return series;
}

export async function getMonthlySeries(
  match: Filter<DailyStatDoc> = {}
): Promise<MonthlyPeriodRow[]> {
  const todayMonth = utcToday().slice(0, 7);
  const pipeline: Document[] = [
    ...scopeStage(match),
    {
      $group: {
        _id: { $substrBytes: ["$date", 0, 7] },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({ yearMonth: "$_id" }),
    { $sort: { yearMonth: 1 } },
  ];
  const rows = await statsColl().aggregate<MonthlyPeriodRow>(pipeline).toArray();
  return rows
    .filter((row) => row.yearMonth && row.yearMonth <= todayMonth)
    .map(hydrateCounters);
}

export async function getClientMerchantBreakdown(
  clientId: string,
  period: StatsPeriod
): Promise<MerchantPeriodRow[]> {
  const pipeline = [
    ...scopeStage({ clientId }, period),
    {
      $group: {
        _id: "$merchantId",
        merchantDomain: { $last: "$merchantDomain" },
        merchantName: { $last: "$merchantName" },
        clientIds: { $addToSet: "$clientId" },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({
      merchantId: "$_id",
      merchantDomain: "$merchantDomain",
      merchantName: "$merchantName",
      clientCount: { $size: "$clientIds" },
    }),
    { $match: ACTIVITY_MATCH },
    {
      $sort: {
        "validationsStats.totalValidationsCount": -1,
        "promotionsStats.receivedPromotions": -1,
        merchantDomain: 1,
      },
    },
  ];
  const rows = await statsColl().aggregate<MerchantPeriodRow>(pipeline).toArray();
  return rows.map(hydrateCounters);
}

export async function getMerchantClientBreakdown(
  merchantId: string,
  period: StatsPeriod
): Promise<ClientPeriodRow[]> {
  const pipeline = [
    ...scopeStage({ merchantId }, period),
    {
      $group: {
        _id: "$clientId",
        merchantIds: { $addToSet: "$merchantId" },
        ...periodSumGroup(),
      },
    },
    projectNestedCounters({
      clientId: "$_id",
      merchantCount: { $size: "$merchantIds" },
    }),
    { $match: ACTIVITY_MATCH },
    {
      $sort: {
        "validationsStats.totalValidationsCount": -1,
        "promotionsStats.receivedPromotions": -1,
        clientId: 1,
      },
    },
  ];
  const rows = await statsColl().aggregate<ClientPeriodRow>(pipeline).toArray();
  return rows.map(hydrateCounters);
}

export async function getStatMerchant(merchantId: string): Promise<{
  merchantId: string;
  merchantDomain: string;
  merchantName?: string;
} | null> {
  const doc = await statsColl().findOne(
    { merchantId },
    { projection: { merchantId: 1, merchantDomain: 1, merchantName: 1 } }
  );
  if (!doc) return null;
  return {
    merchantId: doc.merchantId,
    merchantDomain: doc.merchantDomain,
    merchantName: doc.merchantName,
  };
}

export async function getStatsClientIds(): Promise<string[]> {
  const ids = await statsColl().distinct("clientId");
  return ids.filter((id) => id !== "").sort((a, b) => a.localeCompare(b));
}

export async function getClientNames(): Promise<Map<string, string>> {
  const rows = await db()
    .collection<{ clientId: string; name: string }>("clients")
    .find({})
    .project({ clientId: 1, name: 1, _id: 0 })
    .toArray();
  return new Map(rows.filter((row) => row.clientId).map((row) => [row.clientId, row.name]));
}

export async function isDayFinalized(
  date: string,
  match: Filter<DailyStatDoc> = {}
): Promise<boolean> {
  const pipeline: Document[] = [
    ...scopeStage(match, { granularity: "day", date, yearMonth: date.slice(0, 7) }),
    {
      $group: {
        _id: null,
        finalized: { $min: { $cond: [{ $eq: ["$finalized", true] }, 1, 0] } },
        count: { $sum: 1 },
      },
    },
  ];
  const [row] = await statsColl()
    .aggregate<{ finalized: number; count: number }>(pipeline)
    .toArray();
  return row != null && row.count > 0 && row.finalized === 1;
}

export async function clientHasStats(clientId: string): Promise<boolean> {
  const doc = await statsColl().findOne({ clientId }, { projection: { _id: 1 } });
  return doc != null;
}

function addDays(from: string, days: number): string {
  const start = new Date(`${from}T00:00:00.000Z`);
  return new Date(start.getTime() + days * 86400000).toISOString().slice(0, 10);
}


export interface MerchantFlags {
  validationsAllowed?: boolean;
  scriptGenerated?: boolean;
  scriptReviewed?: boolean;
  botDetection?: boolean;
  fixedBotDetection?: boolean;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function merchantFlagsFromRow(row: MerchantFlags): MerchantFlags {
  return {
    validationsAllowed: optionalBoolean(row.validationsAllowed),
    scriptGenerated: optionalBoolean(row.scriptGenerated),
    scriptReviewed: optionalBoolean(row.scriptReviewed),
    botDetection: optionalBoolean(row.botDetection),
    fixedBotDetection: optionalBoolean(row.fixedBotDetection),
  };
}

// Daily stat rows carry no merchant status. Fetch the flags separately so the
// list can show bot detection.
export async function getMerchantFlags(
  merchantIds: string[]
): Promise<Map<string, MerchantFlags>> {
  const ids = merchantIds.filter(Boolean);
  if (ids.length === 0) return new Map();
  const rows = await db()
    .collection<MerchantFlags & { _id: string }>("merchants")
    .find({ _id: { $in: ids } })
    .project<MerchantFlags & { _id: string }>({
      _id: 1,
      validationsAllowed: 1,
      scriptGenerated: 1,
      scriptReviewed: 1,
      botDetection: 1,
      fixedBotDetection: 1,
    })
    .toArray();
  return new Map(rows.map((r) => [r._id, merchantFlagsFromRow(r)]));
}
