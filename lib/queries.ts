import type { Document, Filter } from "mongodb";
import { db } from "./mongo";
import { escapeRegex, validityVariants } from "./format";

// These collections use string ids (nanoid-style), not ObjectId.
type PromoDoc = Document & { _id: string };

function coll(name: string) {
  return db().collection<PromoDoc>(name);
}

export const PAGE_SIZE = 25;

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

async function paginate(
  collection: string,
  filter: Filter<PromoDoc>,
  page: number,
  sort: Document = { createdAt: -1 }
): Promise<Paged<Document>> {
  const c = coll(collection);
  const total = await c.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const items = await c
    .find(filter)
    .sort(sort)
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();
  return { items, total, page: safePage, pages };
}

export interface ValidationJobFilters {
  q?: string;
  clientId?: string;
  reportType?: string;
  success?: string; // "true" | "false"
  failCode?: string;
  page?: number;
}

export async function getValidationJobs(f: ValidationJobFilters) {
  const filter: Filter<PromoDoc> = {};
  if (f.clientId) filter.clientId = f.clientId;
  if (f.reportType) filter.reportType = f.reportType;
  if (f.success === "true") filter.success = true;
  if (f.success === "false") filter.success = false;
  if (f.failCode) filter.failCodes = f.failCode;
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [
      { domain: rx },
      { sourceUrl: rx },
      { promotionId: f.q },
      { promotionUniqId: f.q },
      { _id: f.q },
    ];
  }
  return paginate("validationLogs", filter, f.page ?? 1);
}

export interface ExtractionJobFilters {
  q?: string;
  failedDiscoveryCode?: string;
  page?: number;
}

export async function getExtractionJobs(f: ExtractionJobFilters) {
  const filter: Filter<PromoDoc> = {};
  if (f.failedDiscoveryCode) filter.failedDiscoveryCodes = f.failedDiscoveryCode;
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [{ domain: rx }, { sourceUrl: rx }, { _id: f.q }];
  }
  return paginate("extractionLogs", filter, f.page ?? 1);
}

export interface PromotionFilters {
  q?: string;
  clientId?: string;
  validityStatus?: string;
  page?: number;
}

export async function getPromotions(f: PromotionFilters) {
  const filter: Filter<PromoDoc> = {};
  if (f.clientId) filter.clientId = f.clientId;
  if (f.validityStatus) filter.validityStatus = { $in: validityVariants(f.validityStatus) };
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [
      { domain: rx },
      { sourceUrl: rx },
      { description: rx },
      { merchantId: rx },
      { "conditions.code": rx },
      { uniqId: f.q },
      { _id: f.q },
    ];
  }
  return paginate("promotions", filter, f.page ?? 1, { _id: -1 });
}

export async function getValidationJob(id: string) {
  return coll("validationLogs").findOne({ _id: id });
}

export async function getExtractionJob(id: string) {
  return coll("extractionLogs").findOne({ _id: id });
}

export async function getPromotion(id: string) {
  return coll("promotions").findOne({ _id: id });
}

export async function getPromotionByUniqId(uniqId: string) {
  return coll("promotions").findOne({ uniqId });
}

export async function getValidationsForPromotion(promotionId: string, uniqId?: string) {
  const or: Filter<PromoDoc>[] = [{ promotionId }];
  if (uniqId) or.push({ promotionUniqId: uniqId });
  return coll("validationLogs")
    .find({ $or: or })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}

export async function getMerchant(merchantId: string) {
  // merchantId is usually a string _id into merchants, but older records
  // store a display name; try _id first, then fall back to nothing.
  return coll("merchants").findOne({ _id: merchantId });
}

export interface DailyStat {
  date: string;
  success: number;
  failed: number;
  errors: number;
  validationCost: number;
  extractionCost: number;
  extractions: number;
  promotionsFound: number;
}

export async function getDailyStats(days: number): Promise<DailyStat[]> {
  const since = Date.now() - days * 86400000;
  const dateExpr = {
    $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$createdAt" } },
  };

  const [validation, extraction] = await Promise.all([
    coll("validationLogs")
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: dateExpr,
            success: { $sum: { $cond: ["$success", 1, 0] } },
            // failed = a completed run that concluded the promotion doesn't work;
            // errors = the run itself broke (reportType "error")
            failed: {
              $sum: {
                $cond: [{ $and: [{ $eq: ["$success", false] }, { $ne: ["$reportType", "error"] }] }, 1, 0],
              },
            },
            errors: { $sum: { $cond: [{ $eq: ["$reportType", "error"] }, 1, 0] } },
            cost: { $sum: { $sum: "$llmCosts.totalCost" } },
          },
        },
      ])
      .toArray(),
    coll("extractionLogs")
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: dateExpr,
            extractions: { $sum: 1 },
            promotionsFound: { $sum: { $size: { $ifNull: ["$promotionsFound", []] } } },
            cost: { $sum: { $ifNull: ["$llmCost.totalCost", 0] } },
          },
        },
      ])
      .toArray(),
  ]);

  const byDate = new Map<string, DailyStat>();
  const blank = (date: string): DailyStat => ({
    date,
    success: 0,
    failed: 0,
    errors: 0,
    validationCost: 0,
    extractionCost: 0,
    extractions: 0,
    promotionsFound: 0,
  });
  // Fill every day in range so the charts have a continuous axis.
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    byDate.set(d, blank(d));
  }
  for (const r of validation) {
    const e = byDate.get(r._id) ?? blank(r._id);
    e.success = r.success;
    e.failed = r.failed;
    e.errors = r.errors;
    e.validationCost = r.cost ?? 0;
    byDate.set(r._id, e);
  }
  for (const r of extraction) {
    const e = byDate.get(r._id) ?? blank(r._id);
    e.extractions = r.extractions;
    e.promotionsFound = r.promotionsFound;
    e.extractionCost = r.cost ?? 0;
    byDate.set(r._id, e);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getValidityBreakdown(): Promise<Map<string, number>> {
  const rows = await coll("promotions")
    .aggregate([{ $group: { _id: "$validityStatus", n: { $sum: 1 } } }])
    .toArray();
  return new Map(rows.map((r) => [r._id ?? "unknown", r.n]));
}

export interface MerchantFilters {
  q?: string;
  page?: number;
}

export async function getMerchants(f: MerchantFilters) {
  const filter: Filter<PromoDoc> = {};
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [{ domain: rx }, { _id: f.q }];
  }
  return paginate("merchants", filter, f.page ?? 1, {
    "stats.validationsStats.totalValidationsCount": -1,
    _id: 1,
  });
}

// Costs live only on the job logs, so aggregate them per domain here.
export async function getCostsByDomain(): Promise<
  Map<string, { validationCost: number; extractionCost: number }>
> {
  const [validation, extraction] = await Promise.all([
    coll("validationLogs")
      .aggregate([
        { $unwind: "$llmCosts" },
        { $group: { _id: "$domain", cost: { $sum: "$llmCosts.totalCost" } } },
      ])
      .toArray(),
    coll("extractionLogs")
      .aggregate([{ $group: { _id: "$domain", cost: { $sum: "$llmCost.totalCost" } } }])
      .toArray(),
  ]);
  const out = new Map<string, { validationCost: number; extractionCost: number }>();
  for (const r of validation) {
    if (!r._id) continue;
    out.set(r._id, { validationCost: r.cost ?? 0, extractionCost: 0 });
  }
  for (const r of extraction) {
    if (!r._id) continue;
    const entry = out.get(r._id) ?? { validationCost: 0, extractionCost: 0 };
    entry.extractionCost = r.cost ?? 0;
    out.set(r._id, entry);
  }
  return out;
}

export async function getClientIds(): Promise<string[]> {
  return (await coll("validationLogs").distinct("clientId")).filter(Boolean) as string[];
}

export async function getPromotionClientIds(): Promise<string[]> {
  return (await coll("promotions").distinct("clientId")).filter(Boolean) as string[];
}

export async function getFailCodes(): Promise<string[]> {
  return (await coll("validationLogs").distinct("failCodes")).filter(Boolean) as string[];
}

export async function getFailedDiscoveryCodes(): Promise<string[]> {
  return (await coll("extractionLogs").distinct("failedDiscoveryCodes")).filter(
    Boolean
  ) as string[];
}
