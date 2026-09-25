import Link from "next/link";
import { KVGrid } from "@/components/Section";
import { formatCost, formatCount, formatUtcDay, formatUtcMonth } from "@/lib/format";
import {
  PROMOTION_OUTCOMES_PENDING_HINT,
  isPromotionOutcomesPending,
  type PeriodStatsCounters,
} from "@/lib/stats-model";

export const counterThClass = "px-3 py-2";
export const counterGroupThClass =
  "border-b border-line px-3 py-2 text-center normal-case tracking-normal";
export const counterValidationsDividerClass = "border-l border-line";

export const PROMOTIONS_COL_SPAN = 6;
export const VALIDATIONS_COL_SPAN = 5;
export const COUNTER_COL_SPAN = PROMOTIONS_COL_SPAN + VALIDATIONS_COL_SPAN;

function CounterSubHeadings({ leadingDivider }: { leadingDivider?: boolean }) {
  return (
    <>
      <th className={leadingDivider ? `${counterThClass} ${counterValidationsDividerClass}` : counterThClass}>
        Received
      </th>
      <th className={counterThClass}>Exported</th>
      <th className={counterThClass}>Client-facing</th>
      <th className={counterThClass}>Debug</th>
      <th className={counterThClass}>Cannot validate</th>
      <th className={counterThClass}>Filtered</th>
      <th className={`${counterThClass} ${counterValidationsDividerClass}`}>Validations</th>
      <th className={counterThClass}>Conclusions</th>
      <th className={counterThClass}>Errors</th>
      <th className={counterThClass}>Bot detection</th>
      <th className={counterThClass}>Cost</th>
    </>
  );
}

export function CounterTableHead({
  leading,
  leadingDivider,
}: {
  leading?: React.ReactNode;
  leadingDivider?: boolean;
}) {
  const promotionsGroupClass = leadingDivider
    ? `${counterGroupThClass} ${counterValidationsDividerClass}`
    : counterGroupThClass;

  return (
    <>
      <tr>
        {leading}
        <th colSpan={PROMOTIONS_COL_SPAN} className={promotionsGroupClass}>
          Promotions
        </th>
        <th colSpan={VALIDATIONS_COL_SPAN} className={`${counterGroupThClass} ${counterValidationsDividerClass}`}>
          Validations
        </th>
      </tr>
      <tr>
        <CounterSubHeadings leadingDivider={leadingDivider} />
      </tr>
    </>
  );
}

function pendingCellClass(className: string, pending?: boolean): string {
  return pending ? `${className} pending-promotion-outcome` : className;
}

function PendingCount({
  value,
  pending,
  toneClass,
}: {
  value: string;
  pending?: boolean;
  toneClass: string;
}) {
  const pendingHint = pending ? PROMOTION_OUTCOMES_PENDING_HINT : undefined;
  return (
    <td
      className={pendingCellClass(`px-3 py-2 ${toneClass}`, pending)}
      data-hint={pendingHint}
      tabIndex={pending ? 0 : undefined}
    >
      {value}
    </td>
  );
}

export function CounterCells({
  stats,
  leadingDivider,
  pendingPromotionOutcomes,
}: {
  stats: PeriodStatsCounters;
  leadingDivider?: boolean;
  pendingPromotionOutcomes?: boolean;
}) {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  return (
    <>
      <td className={leadingDivider ? `px-3 py-2 ${counterValidationsDividerClass}` : "px-3 py-2"}>
        {formatCount(p.receivedPromotions)}
      </td>
      <td className="px-3 py-2">{formatCount(p.promotionsExportedToCsv)}</td>
      <PendingCount
        value={formatCount(p.clientFacingCount)}
        pending={pendingPromotionOutcomes}
        toneClass="text-ok"
      />
      <PendingCount
        value={formatCount(p.leftForDebugCount)}
        pending={pendingPromotionOutcomes}
        toneClass="text-bad"
      />
      <td className="px-3 py-2">{formatCount(p.cannotValidateCount)}</td>
      <td className="px-3 py-2">{formatCount(p.merchantAutomationIssuesCount)}</td>
      <td className={`px-3 py-2 ${counterValidationsDividerClass}`}>{formatCount(v.totalValidationsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.conclusionsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.errorsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.botDetectionValidationCount)}</td>
      <td className="whitespace-nowrap px-3 py-2">{formatCost(v.totalValidationsCost)}</td>
    </>
  );
}

export function DayCounters({
  stats,
  pendingPromotionOutcomes,
}: {
  stats: PeriodStatsCounters;
  pendingPromotionOutcomes?: boolean;
}) {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  const pendingHint = pendingPromotionOutcomes ? PROMOTION_OUTCOMES_PENDING_HINT : undefined;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Promotions</h2>
        <KVGrid
          rows={[
            ["Received", formatCount(p.receivedPromotions)],
            ["Exported to CSV", formatCount(p.promotionsExportedToCsv)],
            ["Total (finalized outcomes)", formatCount(p.totalPromotionsCount)],
            [
              "Client-facing",
              pendingPromotionOutcomes ? (
                <span className="pending-promotion-outcome rounded px-1" data-hint={pendingHint} tabIndex={0}>
                  {formatCount(p.clientFacingCount)}
                </span>
              ) : (
                formatCount(p.clientFacingCount)
              ),
            ],
            [
              "Left for debug",
              pendingPromotionOutcomes ? (
                <span className="pending-promotion-outcome rounded px-1" data-hint={pendingHint} tabIndex={0}>
                  {formatCount(p.leftForDebugCount)}
                </span>
              ) : (
                formatCount(p.leftForDebugCount)
              ),
            ],
            ["Cannot validate", formatCount(p.cannotValidateCount)],
            ["Merchant automation issues", formatCount(p.merchantAutomationIssuesCount)],
          ]}
        />
      </div>
      <div className="rounded-lg border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Validations</h2>
        <KVGrid
          rows={[
            ["Total runs", formatCount(v.totalValidationsCount)],
            ["Conclusions", formatCount(v.conclusionsCount)],
            ["Client-facing conclusions", formatCount(v.clientFacingCount)],
            ["Left for debug", formatCount(v.leftForDebugCount)],
            ["Errors", formatCount(v.errorsCount)],
            ["Automation failures", formatCount(v.automationFailuresCount)],
            ["Bot detection", formatCount(v.botDetectionValidationCount)],
            ["Merchant website issues", formatCount(v.merchantWebsiteIssuesCount)],
            ["LLM cost", formatCost(v.totalValidationsCost)],
          ]}
        />
      </div>
    </div>
  );
}

export function PeriodSummaryTable({
  label,
  status,
  stats,
  pendingPromotionOutcomes,
}: {
  label: string;
  status?: string;
  stats: PeriodStatsCounters;
  pendingPromotionOutcomes?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-text">Period summary</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
            <CounterTableHead
              leadingDivider
              leading={
                <>
                  <th rowSpan={2} className={counterThClass}>
                    Date
                  </th>
                  <th rowSpan={2} className={counterThClass}>
                    Status
                  </th>
                </>
              }
            />
          </thead>
          <tbody>
            <tr>
              <td className="whitespace-nowrap px-3 py-2">{label}</td>
              <td className="px-3 py-2 text-xs text-muted">{status ?? "—"}</td>
              <CounterCells
                stats={stats}
                leadingDivider
                pendingPromotionOutcomes={pendingPromotionOutcomes}
              />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DailyRows({
  series,
  dayHref,
}: {
  series: Array<PeriodStatsCounters & { date: string; finalized?: boolean }>;
  dayHref: (date: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
        <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
          <CounterTableHead
            leadingDivider
            leading={
              <>
                <th rowSpan={2} className={counterThClass}>
                  Date
                </th>
                <th rowSpan={2} className={counterThClass}>
                  Status
                </th>
              </>
            }
          />
        </thead>
        <tbody className="divide-y divide-rule">
          {[...series].reverse().map((row) => (
            <tr key={row.date} className="hover:bg-tint">
              <td className="whitespace-nowrap px-3 py-2">
                <Link href={dayHref(row.date)} className="text-primary-ink hover:underline">
                  {formatUtcDay(row.date)}
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {row.finalized ? "finalized" : "open"}
              </td>
              <CounterCells
                stats={row}
                leadingDivider
                pendingPromotionOutcomes={isPromotionOutcomesPending(row.finalized)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyRows({
  series,
}: {
  series: Array<PeriodStatsCounters & { yearMonth: string }>;
}) {
  if (series.length === 0) {
    return <p className="text-sm text-faint">No monthly totals yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
        <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
          <CounterTableHead leadingDivider leading={<th rowSpan={2} className={counterThClass}>Month</th>} />
        </thead>
        <tbody className="divide-y divide-rule">
          {[...series].reverse().map((row) => (
            <tr key={row.yearMonth}>
              <td className="whitespace-nowrap px-3 py-2">{formatUtcMonth(row.yearMonth)}</td>
              <CounterCells stats={row} leadingDivider />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
