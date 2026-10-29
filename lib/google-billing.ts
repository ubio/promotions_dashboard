// Google billing reads `googleDailyStats` (one document per country and day).
// Promotion counts are written by promotions-service on the day the promotion
// was created: `promotionsValidated` is a conclusion, `promotionsSent` is an
// export back to Google. The contract prices each sent promotion at a fixed
// GBP amount and shows that spend in USD at a fixed rate. The rate is the
// median GBP–USD over the past 10 years, not a live quote.
import type { Filter } from "mongodb";
import { GOOGLE_CLIENT_ID } from "./client-portal-path";
import { db } from "./mongo";
import { matchPreset } from "@/components/reports/PeriodPresets";

export { GOOGLE_CLIENT_ID };
export const GBP_PER_EXPORTED_PROMOTION = 0.33;
export const GBP_TO_USD = 1.3;
export const GOOGLE_CONTRACT_BUDGET_GBP = 170_000;
const BYTES_PER_GB = 1_000_000_000;

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const gbpFormat = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export interface GoogleBillingFilters {
  from?: string;
  to?: string;
  countries?: string[];
}

export interface GoogleBillingTotals {
  sourcesImported: number;
  promotionsExtracted: number;
  promotionsQualified: number;
  promotionsValidated: number;
  promotionsSent: number;
  llmCostUsd: number;
  proxyBytes: number;
}

export interface GoogleBillingCountry extends GoogleBillingTotals {
  countryCode: string;
}

export interface GoogleBillingDay extends GoogleBillingTotals {
  date: string;
  countries: GoogleBillingCountry[];
}

export interface GoogleBillingReport {
  countries: GoogleBillingCountry[];
  days: GoogleBillingDay[];
  totals: GoogleBillingTotals;
  span: { from: string; to: string } | null;
}

interface GoogleDailyStatDoc {
  clientId: string;
  countryCode: string;
  date: string;
  sourcesImported?: number;
  promotionsExtracted?: number;
  promotionsQualified?: number;
  promotionsValidated?: number;
  promotionsSent?: number;
  validationsStats?: {
    totalValidationsCount?: number;
    totalValidationsCost?: number;
    totalProxyBytes?: number;
  };
}

interface MetricSums {
  sourcesImported: number;
  promotionsExtracted: number;
  promotionsQualified: number;
  promotionsValidated: number;
  promotionsSent: number;
  llmCostUsd: number;
  proxyBytes: number;
}

interface MetricAgg extends MetricSums {
  _id: string;
}

interface DayCountryAgg extends MetricSums {
  _id: { date: string; countryCode: string };
}

interface SpanAgg {
  from: string;
  to: string;
}

interface BillingFacet {
  countries: MetricAgg[];
  days: DayCountryAgg[];
  span: SpanAgg[];
}

function collection() {
  return db().collection<GoogleDailyStatDoc>("googleDailyStats");
}

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function listParam(value: string | string[] | undefined): string[] | undefined {
  if (value == null) return undefined;
  const all = (Array.isArray(value) ? value : [value])
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return all.length > 0 ? all : undefined;
}

export function parseGoogleBillingSearch(sp: {
  [key: string]: string | string[] | undefined;
}): GoogleBillingFilters {
  const fromRaw = one(sp.from);
  const toRaw = one(sp.to);
  const filters: GoogleBillingFilters = {};
  if (isIsoDate(fromRaw) && isIsoDate(toRaw)) {
    filters.from = fromRaw <= toRaw ? fromRaw : toRaw;
    filters.to = fromRaw <= toRaw ? toRaw : fromRaw;
  }
  const countries = listParam(sp.countries);
  if (countries) filters.countries = countries;
  return filters;
}

export function googleBillingHasNarrowing(filters: GoogleBillingFilters): boolean {
  return Boolean(filters.from || filters.to || filters.countries?.length);
}

export function describeGoogleBillingPeriod(
  filters: GoogleBillingFilters,
  span: { from: string; to: string } | null
): string {
  if (!filters.from || !filters.to) {
    return span ? `All time · ${span.from} → ${span.to}` : "All time";
  }
  const preset = matchPreset(filters.from, filters.to);
  const range = `${filters.from} → ${filters.to}`;
  return preset ? `${preset.label} · ${range}` : range;
}

export function googleCountryLabel(code: string): string {
  const region = code.includes("_") ? code.slice(code.lastIndexOf("_") + 1) : code;
  if (!/^[A-Za-z]{2}$/.test(region)) return code;
  const name = regionNames.of(region.toUpperCase());
  if (!name || name.toUpperCase() === region.toUpperCase()) return code;
  return `${name} (${code})`;
}

export function formatUsd(amount: number): string {
  return usdFormat.format(amount);
}

export function formatGbp(amount: number): string {
  return gbpFormat.format(amount);
}

export function exportCostGbp(promotionsSent: number): number {
  return promotionsSent * GBP_PER_EXPORTED_PROMOTION;
}

export function exportCostUsd(promotionsSent: number): number {
  return exportCostGbp(promotionsSent) * GBP_TO_USD;
}

export function formatExportCost(promotionsSent: number): string {
  return `${formatUsd(exportCostUsd(promotionsSent))} (${formatGbp(exportCostGbp(promotionsSent))})`;
}

export function budgetUsedPercent(spentGbp: number): number {
  if (GOOGLE_CONTRACT_BUDGET_GBP <= 0) return 0;
  return (spentGbp / GOOGLE_CONTRACT_BUDGET_GBP) * 100;
}

export function qualifiedSharePercent(qualified: number, extracted: number): number | null {
  if (extracted <= 0) return null;
  return (qualified / extracted) * 100;
}

export function formatSharePercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export function formatGigabytes(bytes: number): string {
  const gigabytes = bytes / BYTES_PER_GB;
  const digits = gigabytes >= 100 ? 0 : gigabytes >= 10 ? 1 : 2;
  return `${gigabytes.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} GB`;
}

export function formatBudgetPercent(percent: number): string {
  const absolute = Math.abs(percent);
  if (absolute > 0 && absolute < 0.1) return `${percent.toFixed(3)}%`;
  if (absolute < 10) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
}

function emptyTotals(): GoogleBillingTotals {
  return {
    sourcesImported: 0,
    promotionsExtracted: 0,
    promotionsQualified: 0,
    promotionsValidated: 0,
    promotionsSent: 0,
    llmCostUsd: 0,
    proxyBytes: 0,
  };
}

function matchFor(filters: GoogleBillingFilters): Filter<GoogleDailyStatDoc> {
  const match: Filter<GoogleDailyStatDoc> = { clientId: GOOGLE_CLIENT_ID };
  if (filters.from && filters.to) {
    match.date = { $gte: filters.from, $lte: filters.to };
  }
  if (filters.countries?.length) {
    match.countryCode = { $in: filters.countries };
  }
  return match;
}

function metricsFrom(row: MetricSums): GoogleBillingTotals {
  return {
    sourcesImported: row.sourcesImported,
    promotionsExtracted: row.promotionsExtracted,
    promotionsQualified: row.promotionsQualified,
    promotionsValidated: row.promotionsValidated,
    promotionsSent: row.promotionsSent,
    llmCostUsd: row.llmCostUsd,
    proxyBytes: row.proxyBytes,
  };
}

function totalsFrom(rows: GoogleBillingCountry[]): GoogleBillingTotals {
  return rows.reduce<GoogleBillingTotals>((total, row) => {
    return {
      sourcesImported: total.sourcesImported + row.sourcesImported,
      promotionsExtracted: total.promotionsExtracted + row.promotionsExtracted,
      promotionsQualified: total.promotionsQualified + row.promotionsQualified,
      promotionsValidated: total.promotionsValidated + row.promotionsValidated,
      promotionsSent: total.promotionsSent + row.promotionsSent,
      llmCostUsd: total.llmCostUsd + row.llmCostUsd,
      proxyBytes: total.proxyBytes + row.proxyBytes,
    };
  }, emptyTotals());
}

export async function getGoogleBillingCountries(): Promise<string[]> {
  const codes = await collection().distinct("countryCode", { clientId: GOOGLE_CLIENT_ID });
  return codes.filter((code) => code !== "").sort((left, right) => left.localeCompare(right));
}

export async function getGoogleBilling(filters: GoogleBillingFilters): Promise<GoogleBillingReport> {
  const [facet] = await collection()
    .aggregate<BillingFacet>([
      { $match: matchFor(filters) },
      {
        $facet: {
          countries: [
            { $group: { _id: "$countryCode", ...metricSums() } },
            { $sort: { _id: 1 } },
          ],
          days: [
            {
              $group: {
                _id: { date: "$date", countryCode: "$countryCode" },
                ...metricSums(),
              },
            },
            { $sort: { "_id.date": -1, "_id.countryCode": 1 } },
          ],
          span: [
            {
              $group: {
                _id: null,
                from: { $min: "$date" },
                to: { $max: "$date" },
              },
            },
            { $project: { _id: 0, from: 1, to: 1 } },
          ],
        },
      },
    ])
    .toArray();

  const countries = (facet?.countries ?? [])
    .filter((row) => row._id !== "")
    .map((row) => ({ countryCode: row._id, ...metricsFrom(row) }));
  const days = daysFrom(facet?.days ?? []);
  const spanRow = facet?.span[0];
  const span = spanRow?.from && spanRow.to ? { from: spanRow.from, to: spanRow.to } : null;
  return { countries, days, totals: totalsFrom(countries), span };
}

function daysFrom(rows: DayCountryAgg[]): GoogleBillingDay[] {
  const grouped = new Map<string, GoogleBillingCountry[]>();
  for (const row of rows) {
    const date = row._id.date;
    const countryCode = row._id.countryCode;
    if (!date || !countryCode) continue;
    const countries = grouped.get(date) ?? [];
    countries.push({ countryCode, ...metricsFrom(row) });
    grouped.set(date, countries);
  }

  return [...grouped.keys()]
    .sort((left, right) => (left < right ? 1 : left > right ? -1 : 0))
    .map((date) => {
      const countries = grouped.get(date) ?? [];
      countries.sort((left, right) => left.countryCode.localeCompare(right.countryCode));
      return { date, countries, ...totalsFrom(countries) };
    });
}

function metricSums() {
  return {
    sourcesImported: { $sum: { $ifNull: ["$sourcesImported", 0] } },
    promotionsExtracted: { $sum: { $ifNull: ["$promotionsExtracted", 0] } },
    promotionsQualified: { $sum: { $ifNull: ["$promotionsQualified", 0] } },
    promotionsValidated: { $sum: { $ifNull: ["$promotionsValidated", 0] } },
    promotionsSent: { $sum: { $ifNull: ["$promotionsSent", 0] } },
    llmCostUsd: { $sum: { $ifNull: ["$validationsStats.totalValidationsCost", 0] } },
    proxyBytes: { $sum: { $ifNull: ["$validationsStats.totalProxyBytes", 0] } },
  };
}

// Shown beside each figure on /billing/google. Google sees this page as their
// client view, so the wording is for them: what the number counts and how it
// relates to the one before it in the funnel. The internal-only figures are
// marked so they are never shown in the client view.
export const GOOGLE_BILLING_HINTS = {
  contractBudget: `Spend against the ${formatGbp(GOOGLE_CONTRACT_BUDGET_GBP)} contract. Only promotions sent back are charged for, so extraction and checking do not draw it down. The bar shows what is left.`,
  sources: "SKU URLs imported from your feed. One source is one product page we visited.",
  extracted:
    "Offers we found on those pages. Higher than the number of pages, because a page often carries more than one offer.",
  qualified:
    "Offers meeting the Google promotion criteria for structure, benefit type and conditions. Offers that do not qualify are never sent.",
  validated:
    "Promotions whose latest check reached a conclusion, whether the offer was valid or not. Counted on the day the promotion was created. Internal figure.",
  sent: "Promotions we found valid and sent back to you, counted on the day each promotion was created. These are the ones charged for.",
  proxy: "Network traffic used running the checks. Internal figure.",
  llmCost: "What we spent with the language-model providers on these checks. Internal figure.",
  exportCost: `Charged at ${formatGbp(GBP_PER_EXPORTED_PROMOTION)} per promotion sent back, shown in USD at a fixed rate of ${GBP_TO_USD}.`,
  country: "The locale of the imported URL, not where the merchant is based.",
  day: "The day these figures were recorded. Each line is that day's total across the selected countries. Promotion counts are for promotions created that day. Expand countries shows the same figures for each country.",
} as const;
