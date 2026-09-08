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

interface StatDoc {
  _id: string;
  clientId: string;
  merchantId: string;
  merchantDomain: string;
  merchantName?: string;
  last30Days: Array<PeriodStatsCounters & { date: string; finalized?: boolean }>;
  monthlyStats: Array<PeriodStatsCounters & { yearMonth: string }>;
}

function statsColl() {
  return db().collection<StatDoc>("stats");
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

function periodSumGroup(prefix: string): Document {
  return {
    receivedPromotions: { $sum: { $ifNull: [`$${prefix}.promotionsStats.receivedPromotions`, 0] } },
    promotionsExportedToCsv: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.promotionsExportedToCsv`, 0] },
    },
    totalPromotionsCount: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.totalPromotionsCount`, 0] },
    },
    promotionsClientFacingCount: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.clientFacingCount`, 0] },
    },
    promotionsLeftForDebugCount: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.leftForDebugCount`, 0] },
    },
    cannotValidateCount: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.cannotValidateCount`, 0] },
    },
    merchantAutomationIssuesCount: {
      $sum: { $ifNull: [`$${prefix}.promotionsStats.merchantAutomationIssuesCount`, 0] },
    },
    totalValidationsCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.totalValidationsCount`, 0] },
    },
    totalValidationsCost: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.totalValidationsCost`, 0] },
    },
    conclusionsCount: { $sum: { $ifNull: [`$${prefix}.validationsStats.conclusionsCount`, 0] } },
    validationsClientFacingCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.clientFacingCount`, 0] },
    },
    validationsLeftForDebugCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.leftForDebugCount`, 0] },
    },
    errorsCount: { $sum: { $ifNull: [`$${prefix}.validationsStats.errorsCount`, 0] } },
    automationFailuresCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.automationFailuresCount`, 0] },
    },
    botDetectionValidationCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.botDetectionValidationCount`, 0] },
    },
    merchantWebsiteIssuesCount: {
      $sum: { $ifNull: [`$${prefix}.validationsStats.merchantWebsiteIssuesCount`, 0] },
    },
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

function periodBuckets(period: StatsPeriod): Document[] {
  if (period.granularity === "all") {
    // Finalized months plus any still-open days in the rolling window.
    return [
      { $unwind: "$monthlyStats" },
      { $set: { period: "$monthlyStats" } },
      {
        $unionWith: {
          coll: "stats",
          pipeline: [
            { $unwind: "$last30Days" },
            { $match: { "last30Days.finalized": { $ne: true } } },
            { $set: { period: "$last30Days" } },
          ],
        },
      },
    ];
  }
  if (period.granularity === "day") {
    return [
      { $unwind: "$last30Days" },
      { $match: { "last30Days.date": period.date } },
      { $set: { period: "$last30Days" } },
    ];
  }
  const yearMonth = period.yearMonth;
  return [
    { $unwind: "$monthlyStats" },
    { $match: { "monthlyStats.yearMonth": yearMonth } },
    { $set: { period: "$monthlyStats" } },
    {
      $unionWith: {
        coll: "stats",
        pipeline: [
          { $unwind: "$last30Days" },
          {
            $match: {
              "last30Days.date": { $gte: `${yearMonth}-01`, $lte: `${yearMonth}-31` },
              "last30Days.finalized": { $ne: true },
            },
          },
          { $set: { period: "$last30Days" } },
        ],
      },
    },
  ];
}

function isUnionWithStage(
  stage: Document
): stage is { $unionWith: { coll: string; pipeline: Document[] } } {
  if (!("$unionWith" in stage)) return false;
  const union = stage.$unionWith;
  return (
    typeof union === "object" &&
    union != null &&
    "coll" in union &&
    "pipeline" in union &&
    Array.isArray(union.pipeline)
  );
}

function withIdentityMatch(match: Filter<StatDoc>, pipeline: Document[]): Document[] {
  if (Object.keys(match).length === 0) return pipeline;
  const prefixed: Document[] = [{ $match: match }];
  for (const stage of pipeline) {
    if (isUnionWithStage(stage)) {
      prefixed.push({
        $unionWith: {
          coll: stage.$unionWith.coll,
          pipeline: [{ $match: match }, ...stage.$unionWith.pipeline],
        },
      });
    } else {
      prefixed.push(stage);
    }
  }
  return prefixed;
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
  const match: Filter<StatDoc> = {};
  if (opts.q) match.clientId = opts.q;
  const pipeline = withIdentityMatch(match, [
    ...periodBuckets(period),
    {
      $group: {
        _id: "$clientId",
        merchantIds: { $addToSet: "$merchantId" },
        ...periodSumGroup("period"),
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
  ]);
  const [result] = await statsColl().aggregate<FacetResult<ClientPeriodRow>>(pipeline).toArray();
  const paged = pagedFromFacet(result, page);
  return { ...paged, items: paged.items.map(hydrateCounters) };
}

export async function getMerchantPeriodRows(
  period: StatsPeriod,
  opts: { q?: string; page?: number; status?: MerchantHighlight } = {}
): Promise<Paged<MerchantPeriodRow>> {
  const page = opts.page ?? 1;
  const match: Filter<StatDoc> = {};
  if (opts.q) {
    const rx = { $regex: escapeRegex(opts.q), $options: "i" };
    match.$or = [{ merchantDomain: rx }, { merchantName: rx }, { merchantId: opts.q }];
  }
  const pipeline = withIdentityMatch(match, [
    ...periodBuckets(period),
    {
      $group: {
        _id: "$merchantId",
        merchantDomain: { $last: "$merchantDomain" },
        merchantName: { $last: "$merchantName" },
        clientIds: { $addToSet: "$clientId" },
        ...periodSumGroup("period"),
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
  ]);
  const [result] = await statsColl().aggregate<FacetResult<MerchantPeriodRow>>(pipeline).toArray();
  const paged = pagedFromFacet(result, page);
  return { ...paged, items: paged.items.map(hydrateCounters) };
}

export async function getPeriodTotals(
  period: StatsPeriod,
  match: Filter<StatDoc> = {}
): Promise<PeriodStatsCounters> {
  const pipeline = withIdentityMatch(match, [
    ...periodBuckets(period),
    { $group: { _id: null, ...periodSumGroup("period") } },
    projectNestedCounters(),
  ]);
  const [row] = await statsColl().aggregate<PeriodStatsCounters>(pipeline).toArray();
  return completePeriodStats(row);
}

export async function getDailySeries(
  match: Filter<StatDoc> = {}
): Promise<DatedPeriodRow[]> {
  const { from, to } = last30DateRange();
  const pipeline: Document[] = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $unwind: "$last30Days" },
    { $match: { "last30Days.date": { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$last30Days.date",
        finalized: { $min: { $cond: [{ $eq: ["$last30Days.finalized", true] }, 1, 0] } },
        ...periodSumGroup("last30Days"),
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
  match: Filter<StatDoc> = {}
): Promise<MonthlyPeriodRow[]> {
  const todayMonth = utcToday().slice(0, 7);
  const pipeline = withIdentityMatch(match, [
    { $unwind: "$monthlyStats" },
    { $set: { period: "$monthlyStats", yearMonth: "$monthlyStats.yearMonth" } },
    {
      $unionWith: {
        coll: "stats",
        pipeline: [
          { $unwind: "$last30Days" },
          { $match: { "last30Days.finalized": { $ne: true } } },
          {
            $set: {
              period: "$last30Days",
              yearMonth: { $substrBytes: ["$last30Days.date", 0, 7] },
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$yearMonth",
        ...periodSumGroup("period"),
      },
    },
    projectNestedCounters({ yearMonth: "$_id" }),
    { $sort: { yearMonth: 1 } },
  ]);
  const rows = await statsColl().aggregate<MonthlyPeriodRow>(pipeline).toArray();
  return rows
    .filter((row) => row.yearMonth && row.yearMonth <= todayMonth)
    .map(hydrateCounters);
}

export async function getClientMerchantBreakdown(
  clientId: string,
  period: StatsPeriod
): Promise<MerchantPeriodRow[]> {
  const pipeline = withIdentityMatch({ clientId }, [
    ...periodBuckets(period),
    {
      $group: {
        _id: "$merchantId",
        merchantDomain: { $last: "$merchantDomain" },
        merchantName: { $last: "$merchantName" },
        clientIds: { $addToSet: "$clientId" },
        ...periodSumGroup("period"),
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
  ]);
  const rows = await statsColl().aggregate<MerchantPeriodRow>(pipeline).toArray();
  return rows.map(hydrateCounters);
}

export async function getMerchantClientBreakdown(
  merchantId: string,
  period: StatsPeriod
): Promise<ClientPeriodRow[]> {
  const pipeline = withIdentityMatch({ merchantId }, [
    ...periodBuckets(period),
    {
      $group: {
        _id: "$clientId",
        merchantIds: { $addToSet: "$merchantId" },
        ...periodSumGroup("period"),
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
  ]);
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
  match: Filter<StatDoc> = {}
): Promise<boolean> {
  const pipeline: Document[] = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $unwind: "$last30Days" },
    { $match: { "last30Days.date": date } },
    {
      $group: {
        _id: null,
        finalized: { $min: { $cond: [{ $eq: ["$last30Days.finalized", true] }, 1, 0] } },
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
}

// Stats rows come from the `stats` collection, which carries no merchant
// status. Fetch the flags separately so the list can show bot detection.
export async function getMerchantFlags(
  merchantIds: string[]
): Promise<Map<string, MerchantFlags>> {
  const ids = merchantIds.filter(Boolean);
  if (ids.length === 0) return new Map();
  const rows = await db()
    .collection<Document & { _id: string }>("merchants")
    .find({ _id: { $in: ids } })
    .project({ validationsAllowed: 1, scriptGenerated: 1, scriptReviewed: 1, botDetection: 1 })
    .toArray();
  return new Map(rows.map((r) => [String(r._id), r as MerchantFlags]));
}
