// Client-facing data access. Everything a ZiffDavis user sees comes through
// here, so the safety rules live in one place:
//
//  1. Every query is scoped to the caller's clientId — never a parameter the
//     browser controls.
//  2. Only client-facing runs carry detail. Runs that failed on our side
//     (AUTOMATION_FAILURE_FAIL_CODES, or reportType "error") are reported as
//     "could not complete" with no internal reasoning, because that text
//     contains our tooling names, local file paths and cost-limit messages.
//  3. Reasoning is sanitised as a backstop even on client-facing runs.
//  4. No cost fields are selected at all.
import type { Document, Filter } from "mongodb";
import { db } from "./mongo";
import {
  AUTOMATION_FAILURE_FAIL_CODES,
  CLIENT_FACING_FAIL_CODES,
  OTHER_FAIL_CODES,
} from "./fail-codes";

type LogDoc = Document & { _id: string };

function logs() {
  return db().collection<LogDoc>("validationLogs");
}

// Plain English for the codes a client should see. Anything not listed is
// treated as an internal issue and never labelled in the portal.
export const REASON_LABELS: Record<string, string> = {
  PROMO_CODE_IS_NOT_WORKING: "Code rejected at checkout",
  PROMO_CODE_NOT_APPLICABLE_TO_THIS_PRODUCT: "Code not valid for this product",
  DISCOUNT_IS_NOT_APPLIED: "No discount applied",
  FREE_SHIPPING_IS_NOT_APPLIED: "Free shipping not applied",
  PRODUCT_OUT_OF_STOCK: "Product out of stock",
  SKU_PAGE_NOT_FOUND: "Product page not found",
  PROMOTION_CORRECTION: "Offer terms differ from those supplied",
  WEBSITE_ISSUE: "Merchant site problem",
  WEBSITE_LOADING_ISSUE: "Merchant site would not load",
  WEBSITE_UI_ISSUE: "Merchant site behaved unexpectedly",
  ACCOUNT_BLOCKED: "Merchant blocked the account",
};

export const PORTAL_REASON_CODES = Object.keys(REASON_LABELS);

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? "Could not complete check";
}

// Codes whose detail must never reach a client.
const INTERNAL_CODES = new Set(AUTOMATION_FAILURE_FAIL_CODES);

export function isInternalIssue(r: { reportType?: string; failCodes?: string[] }): boolean {
  if (r.reportType === "error") return true;
  return (r.failCodes ?? []).some((c) => INTERNAL_CODES.has(c));
}

// Backstop for LLM free text: strip anything that names our infrastructure.
const REDACTIONS: [RegExp, string][] = [
  [/\/Users\/[^\s,)'"]*/g, "[internal path]"],
  [/\/(home|opt|var|tmp)\/[^\s,)'"]*/g, "[internal path]"],
  [/[A-Za-z0-9_-]*cloakbrowser[^\s,)'"]*/gi, "[browser]"],
  [/chromium[-\d.]*/gi, "browser"],
  [/\bcost limit[^.]*/gi, "internal limit reached"],
  [/\b(a3|agent)[ _-]?error\b/gi, "automation error"],
  [/\bproxy\b/gi, "network"],
  [/\b(claude|gpt-?\d*|gemini|anthropic|openai)\b/gi, "model"],
];

export function sanitiseReasoning(text: string | undefined | null): string {
  if (!text) return "";
  let out = String(text);
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out;
}

export interface PortalRunFilters {
  clientId: string;
  days: number;
  reason?: string;
  outcome?: "worked" | "did_not_work" | "incomplete";
  domain?: string;
  page?: number;
}

export const PORTAL_PAGE_SIZE = 25;

function baseMatch(f: PortalRunFilters): Filter<LogDoc> {
  const match: Filter<LogDoc> = {
    clientId: f.clientId,
    createdAt: { $gte: Date.now() - f.days * 86400000 },
  };
  if (f.domain) match.domain = f.domain;
  // A run can carry both a client-facing and an automation code. The classifier
  // in toPortalRun treats any automation code as "incomplete", so the query has
  // to apply exactly the same rule or the filters disagree with the rows.
  const reason = f.reason && PORTAL_REASON_CODES.includes(f.reason) ? f.reason : undefined;
  const notAutomation = { $nin: AUTOMATION_FAILURE_FAIL_CODES };

  if (f.outcome === "incomplete") {
    match.$or = [{ reportType: "error" }, { failCodes: { $in: AUTOMATION_FAILURE_FAIL_CODES } }];
    return match;
  }

  if (f.outcome === "worked" || f.outcome === "did_not_work") {
    match.reportType = "conclusion";
    match.success = f.outcome === "worked";
  }

  if (reason) {
    // Both conditions apply to failCodes, so combine them with $all + $nin.
    match.failCodes = { $all: [reason], ...notAutomation };
  } else if (f.outcome === "worked" || f.outcome === "did_not_work") {
    match.failCodes = notAutomation;
  }

  if (f.outcome === "did_not_work" && !reason) {
    match.failCodes = { $in: [...CLIENT_FACING_FAIL_CODES, ...OTHER_FAIL_CODES], ...notAutomation };
  }

  return match;
}

export interface PortalRun {
  id: string;
  createdAt: number;
  domain?: string;
  sourceUrl?: string;
  code?: string;
  outcome: "worked" | "did_not_work" | "incomplete";
  reasons: string[];
  explanation: string;
  screenshot?: string;
  promotionId?: string;
}

function toPortalRun(r: Document): PortalRun {
  const internal = isInternalIssue(r);
  const outcome: PortalRun["outcome"] = internal
    ? "incomplete"
    : r.success === true
      ? "worked"
      : "did_not_work";
  return {
    id: String(r._id),
    createdAt: r.createdAt,
    domain: r.domain,
    sourceUrl: r.sourceUrl,
    outcome,
    // Internal issues expose neither their codes nor their reasoning.
    reasons: internal ? [] : (r.failCodes ?? []).filter((c: string) => c in REASON_LABELS),
    explanation: internal
      ? "We could not complete this check. Our team is looking into it — it is not a problem with your offer."
      : sanitiseReasoning(r.reasoning),
    screenshot: internal ? undefined : r.screenshot,
    promotionId: r.promotionId,
  };
}

export async function getPortalRuns(
  f: PortalRunFilters
): Promise<{ items: PortalRun[]; total: number; page: number; pages: number }> {
  const match = baseMatch(f);
  const total = await logs().countDocuments(match);
  const pages = Math.max(1, Math.ceil(total / PORTAL_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);
  const rows = await logs()
    .find(match)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PORTAL_PAGE_SIZE)
    .limit(PORTAL_PAGE_SIZE)
    // Cost fields are deliberately not projected.
    .project({
      createdAt: 1,
      domain: 1,
      sourceUrl: 1,
      success: 1,
      reportType: 1,
      failCodes: 1,
      reasoning: 1,
      screenshot: 1,
      promotionId: 1,
    })
    .toArray();
  return { items: rows.map(toPortalRun), total, page, pages };
}

export interface PortalSummary {
  runs: number;
  worked: number;
  didNotWork: number;
  incomplete: number;
}

export async function getPortalSummary(clientId: string, days: number): Promise<PortalSummary> {
  const rows = await logs()
    .aggregate<{ _id: null; runs: number; worked: number; incomplete: number }>([
      { $match: { clientId, createdAt: { $gte: Date.now() - days * 86400000 } } },
      {
        $group: {
          _id: null,
          runs: { $sum: 1 },
          worked: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$reportType", "conclusion"] }, "$success"] }, 1, 0],
            },
          },
          incomplete: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$reportType", "error"] },
                    {
                      $gt: [
                        {
                          $size: {
                            $setIntersection: [
                              { $ifNull: ["$failCodes", []] },
                              AUTOMATION_FAILURE_FAIL_CODES,
                            ],
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();
  const r = rows[0];
  if (!r) return { runs: 0, worked: 0, didNotWork: 0, incomplete: 0 };
  return {
    runs: r.runs,
    worked: r.worked,
    incomplete: r.incomplete,
    didNotWork: Math.max(0, r.runs - r.worked - r.incomplete),
  };
}

export interface ReasonCount {
  code: string;
  label: string;
  runs: number;
}

// Why offers are failing — client-facing reasons only.
export async function getPortalReasons(clientId: string, days: number): Promise<ReasonCount[]> {
  const rows = await logs()
    .aggregate<{ _id: string; runs: number }>([
      {
        $match: {
          clientId,
          createdAt: { $gte: Date.now() - days * 86400000 },
          reportType: "conclusion",
          failCodes: { $in: PORTAL_REASON_CODES },
        },
      },
      { $unwind: "$failCodes" },
      { $match: { failCodes: { $in: PORTAL_REASON_CODES } } },
      { $group: { _id: "$failCodes", runs: { $sum: 1 } } },
      { $sort: { runs: -1 } },
    ])
    .toArray();
  return rows.map((r) => ({ code: r._id, label: reasonLabel(r._id), runs: r.runs }));
}

export async function getPortalDomains(clientId: string, days: number): Promise<string[]> {
  const rows = await logs().distinct("domain", {
    clientId,
    createdAt: { $gte: Date.now() - days * 86400000 },
  });
  return (rows as string[]).filter(Boolean).sort();
}
