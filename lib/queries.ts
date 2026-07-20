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
