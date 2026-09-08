// Mirrors promotions-service Stat schema (collection `stats`).
// One document per (clientId, merchantId). Daily buckets live in last30Days
// (rolling 30 days + a few future slots). Closed days are rolled into monthlyStats.

export interface PromotionStats {
  receivedPromotions: number;
  promotionsExportedToCsv: number;
  totalPromotionsCount: number;
  clientFacingCount: number;
  leftForDebugCount: number;
  cannotValidateCount: number;
  merchantAutomationIssuesCount: number;
}

export interface ValidationStats {
  totalValidationsCount: number;
  totalValidationsCost: number;
  conclusionsCount: number;
  clientFacingCount: number;
  leftForDebugCount: number;
  errorsCount: number;
  automationFailuresCount: number;
  botDetectionValidationCount: number;
  merchantWebsiteIssuesCount: number;
}

export interface PeriodStatsCounters {
  promotionsStats: PromotionStats;
  validationsStats: ValidationStats;
}

export interface DailyStat extends PeriodStatsCounters {
  date: string;
  finalized?: boolean;
}

export interface MonthlyStat extends PeriodStatsCounters {
  yearMonth: string;
}

export type Granularity = "day" | "month" | "all";

export interface StatsPeriod {
  granularity: Granularity;
  date: string;
  yearMonth: string;
}

export function emptyPromotionStats(): PromotionStats {
  return {
    receivedPromotions: 0,
    promotionsExportedToCsv: 0,
    totalPromotionsCount: 0,
    clientFacingCount: 0,
    leftForDebugCount: 0,
    cannotValidateCount: 0,
    merchantAutomationIssuesCount: 0,
  };
}

export function emptyValidationStats(): ValidationStats {
  return {
    totalValidationsCount: 0,
    totalValidationsCost: 0,
    conclusionsCount: 0,
    clientFacingCount: 0,
    leftForDebugCount: 0,
    errorsCount: 0,
    automationFailuresCount: 0,
    botDetectionValidationCount: 0,
    merchantWebsiteIssuesCount: 0,
  };
}

export function emptyPeriodStats(): PeriodStatsCounters {
  return {
    promotionsStats: emptyPromotionStats(),
    validationsStats: emptyValidationStats(),
  };
}

export function completePromotionStats(partial?: Partial<PromotionStats>): PromotionStats {
  const empty = emptyPromotionStats();
  return {
    receivedPromotions: partial?.receivedPromotions ?? empty.receivedPromotions,
    promotionsExportedToCsv: partial?.promotionsExportedToCsv ?? empty.promotionsExportedToCsv,
    totalPromotionsCount: partial?.totalPromotionsCount ?? empty.totalPromotionsCount,
    clientFacingCount: partial?.clientFacingCount ?? empty.clientFacingCount,
    leftForDebugCount: partial?.leftForDebugCount ?? empty.leftForDebugCount,
    cannotValidateCount: partial?.cannotValidateCount ?? empty.cannotValidateCount,
    merchantAutomationIssuesCount:
      partial?.merchantAutomationIssuesCount ?? empty.merchantAutomationIssuesCount,
  };
}

export function completeValidationStats(partial?: Partial<ValidationStats>): ValidationStats {
  const empty = emptyValidationStats();
  return {
    totalValidationsCount: partial?.totalValidationsCount ?? empty.totalValidationsCount,
    totalValidationsCost: partial?.totalValidationsCost ?? empty.totalValidationsCost,
    conclusionsCount: partial?.conclusionsCount ?? empty.conclusionsCount,
    clientFacingCount: partial?.clientFacingCount ?? empty.clientFacingCount,
    leftForDebugCount: partial?.leftForDebugCount ?? empty.leftForDebugCount,
    errorsCount: partial?.errorsCount ?? empty.errorsCount,
    automationFailuresCount: partial?.automationFailuresCount ?? empty.automationFailuresCount,
    botDetectionValidationCount:
      partial?.botDetectionValidationCount ?? empty.botDetectionValidationCount,
    merchantWebsiteIssuesCount:
      partial?.merchantWebsiteIssuesCount ?? empty.merchantWebsiteIssuesCount,
  };
}

export function completePeriodStats(partial?: {
  promotionsStats?: Partial<PromotionStats>;
  validationsStats?: Partial<ValidationStats>;
}): PeriodStatsCounters {
  return {
    promotionsStats: completePromotionStats(partial?.promotionsStats),
    validationsStats: completeValidationStats(partial?.validationsStats),
  };
}

export function addPromotionStats(left: PromotionStats, right: PromotionStats): PromotionStats {
  return {
    receivedPromotions: left.receivedPromotions + right.receivedPromotions,
    promotionsExportedToCsv: left.promotionsExportedToCsv + right.promotionsExportedToCsv,
    totalPromotionsCount: left.totalPromotionsCount + right.totalPromotionsCount,
    clientFacingCount: left.clientFacingCount + right.clientFacingCount,
    leftForDebugCount: left.leftForDebugCount + right.leftForDebugCount,
    cannotValidateCount: left.cannotValidateCount + right.cannotValidateCount,
    merchantAutomationIssuesCount:
      left.merchantAutomationIssuesCount + right.merchantAutomationIssuesCount,
  };
}

export function addValidationStats(left: ValidationStats, right: ValidationStats): ValidationStats {
  return {
    totalValidationsCount: left.totalValidationsCount + right.totalValidationsCount,
    totalValidationsCost: left.totalValidationsCost + right.totalValidationsCost,
    conclusionsCount: left.conclusionsCount + right.conclusionsCount,
    clientFacingCount: left.clientFacingCount + right.clientFacingCount,
    leftForDebugCount: left.leftForDebugCount + right.leftForDebugCount,
    errorsCount: left.errorsCount + right.errorsCount,
    automationFailuresCount: left.automationFailuresCount + right.automationFailuresCount,
    botDetectionValidationCount:
      left.botDetectionValidationCount + right.botDetectionValidationCount,
    merchantWebsiteIssuesCount: left.merchantWebsiteIssuesCount + right.merchantWebsiteIssuesCount,
  };
}

export function addPeriodStats(
  left: PeriodStatsCounters,
  right: PeriodStatsCounters
): PeriodStatsCounters {
  return {
    promotionsStats: addPromotionStats(left.promotionsStats, right.promotionsStats),
    validationsStats: addValidationStats(left.validationsStats, right.validationsStats),
  };
}

export function isZeroPeriodStats(stats: PeriodStatsCounters): boolean {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  return (
    p.receivedPromotions === 0 &&
    p.promotionsExportedToCsv === 0 &&
    p.totalPromotionsCount === 0 &&
    p.clientFacingCount === 0 &&
    p.leftForDebugCount === 0 &&
    p.cannotValidateCount === 0 &&
    p.merchantAutomationIssuesCount === 0 &&
    v.totalValidationsCount === 0 &&
    v.totalValidationsCost === 0 &&
    v.conclusionsCount === 0 &&
    v.clientFacingCount === 0 &&
    v.leftForDebugCount === 0 &&
    v.errorsCount === 0 &&
    v.automationFailuresCount === 0 &&
    v.botDetectionValidationCount === 0 &&
    v.merchantWebsiteIssuesCount === 0
  );
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function utcYesterday(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

export function utcYearMonth(date: string = utcToday()): string {
  return date.slice(0, 7);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isYearMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function parseGranularity(value: string | undefined): Granularity {
  if (value === "month") return "month";
  if (value === "all") return "all";
  return "day";
}

export function parseStatsPeriod(sp: {
  granularity?: string;
  date?: string;
  yearMonth?: string;
}): StatsPeriod {
  const granularity = parseGranularity(sp.granularity);
  const date = sp.date && isIsoDate(sp.date) ? sp.date : utcYesterday();
  const yearMonth = sp.yearMonth && isYearMonth(sp.yearMonth) ? sp.yearMonth : utcYearMonth(date);
  return { granularity, date, yearMonth };
}

export function firstParam(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export function periodFromSearch(sp: {
  [key: string]: string | string[] | undefined;
}): StatsPeriod {
  return parseStatsPeriod({
    granularity: firstParam(sp.granularity),
    date: firstParam(sp.date),
    yearMonth: firstParam(sp.yearMonth),
  });
}

export const PROMOTION_OUTCOMES_PENDING_HINT =
  "Will be updated when day stats finalized";

export function isPromotionOutcomesPending(finalized?: boolean): boolean {
  return finalized !== true;
}

export function periodPromotionOutcomesPending(
  period: StatsPeriod,
  daily: Array<{ date: string; finalized?: boolean }>
): boolean {
  if (period.granularity !== "day") return false;
  const row = daily.find((day) => day.date === period.date);
  return isPromotionOutcomesPending(row?.finalized);
}

export function periodQuery(period: StatsPeriod): Record<string, string> {
  if (period.granularity === "all") {
    return { granularity: "all" };
  }
  if (period.granularity === "month") {
    return { granularity: "month", yearMonth: period.yearMonth };
  }
  return { granularity: "day", date: period.date };
}

export function addUtcDays(date: string, days: number): string {
  const start = new Date(`${date}T00:00:00.000Z`);
  return new Date(start.getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function last30DateRange(today: string = utcToday()): { from: string; to: string } {
  return { from: addUtcDays(today, -29), to: today };
}
