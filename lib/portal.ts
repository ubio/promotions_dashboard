// Client-facing data access. Everything a client user sees comes through here,
// so the safety rules live in one place:
//
//  1. Every query is scoped to the caller's clientId — never a parameter the
//     browser controls.
//  2. Clients see promotion outcomes from `todayPromotions`, not validation job
//     rows from `validationLogs`.
//  3. Successfully verified = client-facing promotion (promotions-service
//     TodayPromotionStorage.isClientFacingPromotionExpr): valid, or
//     invalid/cannotValidate with ClientFacingFailCodes.
//  4. Validation issues = everything else checked in the period.
//  5. No cost fields are selected at all.
import type { Document, Filter } from "mongodb";
import { db } from "./mongo";
import {
  CLIENT_FACING_FAIL_CODES,
  isClientFacingPromotion,
  validationIssueLabel,
} from "./fail-codes";
import { escapeRegex, normalizeValidity } from "./format";

type PromoDoc = Document & { _id: string };

function promotions() {
  return db().collection<PromoDoc>("todayPromotions");
}

// Plain English for ClientFacingFailCodes only.
export const REASON_LABELS: Record<string, string> = {
  PROMO_CODE_IS_NOT_WORKING: "Code rejected at checkout",
  PROMO_CODE_NOT_APPLICABLE_TO_THIS_PRODUCT: "Code not valid for this product",
  DISCOUNT_IS_NOT_APPLIED: "No discount applied",
  FREE_SHIPPING_IS_NOT_APPLIED: "Free shipping not applied",
  PRODUCT_OUT_OF_STOCK: "Product out of stock",
  SKU_PAGE_NOT_FOUND: "Product page not found",
  PROMOTION_CORRECTION: "Offer terms differ from those supplied",
};

export const PORTAL_REASON_CODES = CLIENT_FACING_FAIL_CODES;

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

function clientFacingFailCodesFrom(raw: string[]): string[] {
  return raw.filter((code) => CLIENT_FACING_FAIL_CODES.includes(code));
}

function nonClientFacingFailCodesFrom(raw: string[]): string[] {
  return raw.filter((code) => !CLIENT_FACING_FAIL_CODES.includes(code));
}

function extractFailCodes(latestValidation: Document, row: Document): string[] {
  if (Array.isArray(latestValidation.failCodes) && latestValidation.failCodes.length > 0) {
    return latestValidation.failCodes;
  }
  if (typeof latestValidation.failCode === "string" && latestValidation.failCode !== "") {
    return [latestValidation.failCode];
  }
  if (Array.isArray(row.failCodes) && row.failCodes.length > 0) {
    return row.failCodes;
  }
  return [];
}

function failCodesPath(): string {
  return "$latestValidation.failCodes";
}

function clientFacingCountExpr(): Document {
  return {
    $size: {
      $setIntersection: [{ $ifNull: [failCodesPath(), []] }, CLIENT_FACING_FAIL_CODES],
    },
  };
}

function isClientFacingPromotionExpr(): Document {
  return {
    $or: [
      { $eq: ["$validityStatus", "valid"] },
      {
        $and: [
          { $in: ["$validityStatus", ["invalid", "cannotValidate"]] },
          { $gt: [clientFacingCountExpr(), 0] },
        ],
      },
    ],
  };
}

function verifiedEvidenceFilter(): Filter<PromoDoc> {
  return { $expr: isClientFacingPromotionExpr() };
}

function validationIssuesFilter(): Filter<PromoDoc> {
  return { $expr: { $not: [isClientFacingPromotionExpr()] } };
}

function findingFromClientFacingFailCodes(failCodes: string[]): string {
  const clientFacing = clientFacingFailCodesFrom(failCodes);
  if (clientFacing.length === 0) return "—";
  return [...new Set(clientFacing.map((code) => reasonLabel(code)))].join("; ");
}

function findingFromValidationIssueFailCodes(failCodes: string[]): string {
  const issueCodes = nonClientFacingFailCodesFrom(failCodes);
  if (issueCodes.length === 0) return "—";
  return [...new Set(issueCodes.map((code) => validationIssueLabel(code)))].join("; ");
}


export interface PortalPromotionFilters {
  clientId: string;
  days?: number;
  reason?: string;
  outcome?: "verified" | "validation_issues";
  finding?: "issue";
  domain?: string;
  q?: string;
  page?: number;
}

export const PORTAL_PAGE_SIZE = 25;

function basePromotionMatch(f: PortalPromotionFilters): Filter<PromoDoc> {
  const match: Filter<PromoDoc> = { clientId: f.clientId };

  if (f.days) {
    match["latestValidation.createdAt"] = { $gte: Date.now() - f.days * 86400000 };
  }

  if (f.domain) match.domain = f.domain;

  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    match.$or = [
      { domain: rx },
      { sourceUrl: rx },
      { description: rx },
      { title: rx },
      { textOnPage: rx },
      { "conditions.code": rx },
      { uniqId: f.q },
      { _id: f.q },
    ];
  }

  const reason =
    f.reason && CLIENT_FACING_FAIL_CODES.includes(f.reason) ? f.reason : undefined;

  if (f.outcome === "verified") {
    match.$and = [...(match.$and ?? []), verifiedEvidenceFilter()];
  } else if (f.outcome === "validation_issues") {
    match.$and = [...(match.$and ?? []), validationIssuesFilter()];
  }

  if (f.finding === "issue") {
    match["latestValidation.failCodes"] = { $in: CLIENT_FACING_FAIL_CODES };
  }

  if (reason) {
    match["latestValidation.failCodes"] = reason;
  }

  return match;
}

export interface PortalPromotion {
  id: string;
  createdAt: number;
  domain?: string;
  sourceUrl?: string;
  countryCode?: string;
  code?: string;
  title?: string;
  description?: string;
  expirationDate?: string;
  discountPercent?: number;
  discountCurrency?: string;
  outcome: "verified" | "validation_issues";
  validityStatus: string | null;
  reasons: string[];
  finding: string;
  screenshot?: string;
}

function toPortalPromotion(r: Document): PortalPromotion {
  const latestValidation = r.latestValidation ?? {};
  const failCodes = extractFailCodes(latestValidation, r);
  const validityStatus =
    typeof r.validityStatus === "string" ? r.validityStatus : undefined;
  const verified = isClientFacingPromotion(validityStatus, failCodes);
  const reasons = clientFacingFailCodesFrom(failCodes);

  return {
    id: String(r._id),
    createdAt: latestValidation.createdAt ?? r.systemMeta?.createdAt ?? 0,
    domain: r.domain,
    sourceUrl: r.sourceUrl,
    code: r.conditions?.code,
    title: r.title,
    description: r.description ?? r.title ?? r.textOnPage,
    countryCode: r.countryCode,
    expirationDate: r.conditions?.expirationDate,
    discountPercent: r.benefits?.discountPercent,
    discountCurrency: r.benefits?.discountCurrency
      ? String(r.benefits.discountCurrency)
      : undefined,
    outcome: verified ? "verified" : "validation_issues",
    validityStatus: r.validityStatus ? normalizeValidity(r.validityStatus) : null,
    reasons,
    finding: verified
      ? validityStatus === "valid"
        ? "—"
        : findingFromClientFacingFailCodes(failCodes)
      : findingFromValidationIssueFailCodes(failCodes),
    screenshot: latestValidation.screenshot,
  };
}

export async function getPortalPromotions(
  f: PortalPromotionFilters
): Promise<{ items: PortalPromotion[]; total: number; page: number; pages: number }> {
  const match = basePromotionMatch(f);
  const total = await promotions().countDocuments(match);
  const pages = Math.max(1, Math.ceil(total / PORTAL_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);
  const rows = await promotions()
    .find(match)
    .sort({ "latestValidation.createdAt": -1, _id: -1 })
    .skip((page - 1) * PORTAL_PAGE_SIZE)
    .limit(PORTAL_PAGE_SIZE)
    .project({
      domain: 1,
      sourceUrl: 1,
      countryCode: 1,
      title: 1,
      description: 1,
      textOnPage: 1,
      conditions: 1,
      benefits: 1,
      validityStatus: 1,
      failCodes: 1,
      latestValidation: 1,
      systemMeta: 1,
    })
    .toArray();
  return { items: rows.map(toPortalPromotion), total, page, pages };
}

export interface PortalSummary {
  checked: number;
  verified: number;
  validationIssues: number;
}

export async function getPortalSummary(clientId: string, days: number): Promise<PortalSummary> {
  const since = Date.now() - days * 86400000;

  const rows = await promotions()
    .aggregate<{ _id: null; checked: number; verified: number; validationIssues: number }>([
      { $match: { clientId, "latestValidation.createdAt": { $gte: since } } },
      {
        $group: {
          _id: null,
          checked: { $sum: 1 },
          verified: {
            $sum: { $cond: [isClientFacingPromotionExpr(), 1, 0] },
          },
          validationIssues: {
            $sum: { $cond: [{ $not: [isClientFacingPromotionExpr()] }, 1, 0] },
          },
        },
      },
    ])
    .toArray();

  const r = rows[0];
  if (!r) return { checked: 0, verified: 0, validationIssues: 0 };
  return {
    checked: r.checked,
    verified: r.verified,
    validationIssues: r.validationIssues,
  };
}

export interface ReasonCount {
  code: string;
  label: string;
  promotions: number;
}

export async function getPortalReasons(clientId: string, days: number): Promise<ReasonCount[]> {
  const since = Date.now() - days * 86400000;

  const rows = await promotions()
    .aggregate<{ _id: string; promotions: number }>([
      {
        $match: {
          clientId,
          "latestValidation.createdAt": { $gte: since },
          "latestValidation.failCodes": { $in: CLIENT_FACING_FAIL_CODES },
        },
      },
      { $unwind: "$latestValidation.failCodes" },
      { $match: { "latestValidation.failCodes": { $in: CLIENT_FACING_FAIL_CODES } } },
      { $group: { _id: "$latestValidation.failCodes", promotions: { $sum: 1 } } },
      { $sort: { promotions: -1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    code: row._id,
    label: reasonLabel(row._id),
    promotions: row.promotions,
  }));
}

export async function getPortalDomains(clientId: string, days?: number): Promise<string[]> {
  const filter: Filter<PromoDoc> = { clientId };
  if (days) {
    filter["latestValidation.createdAt"] = { $gte: Date.now() - days * 86400000 };
  }
  const rows = await promotions().distinct("domain", filter);
  return (rows as string[]).filter(Boolean).sort();
}

export async function getPortalPromotion(
  clientId: string,
  id: string
): Promise<PortalPromotion | null> {
  const row = await promotions().findOne(
    { _id: id, clientId },
    {
      projection: {
        domain: 1,
        sourceUrl: 1,
        countryCode: 1,
        title: 1,
        description: 1,
        textOnPage: 1,
        conditions: 1,
        benefits: 1,
        validityStatus: 1,
        failCodes: 1,
        latestValidation: 1,
        systemMeta: 1,
      },
    }
  );
  return row ? toPortalPromotion(row) : null;
}
