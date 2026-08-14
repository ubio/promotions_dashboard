import Link from "next/link";
import { KVGrid } from "@/components/Section";
import { formatCost, formatCount, formatUtcDay, formatUtcMonth } from "@/lib/format";
import type { PeriodStatsCounters } from "@/lib/stats-model";

export function CounterHeadings() {
  return (
    <>
      <th className="px-3 py-2">Received</th>
      <th className="px-3 py-2">Exported</th>
      <th className="px-3 py-2">Client-facing</th>
      <th className="px-3 py-2">Debug</th>
      <th className="px-3 py-2">Cannot validate</th>
      <th className="px-3 py-2">Validations</th>
      <th className="px-3 py-2">Conclusions</th>
      <th className="px-3 py-2">Errors</th>
      <th className="px-3 py-2">Bot detection</th>
      <th className="px-3 py-2">Cost</th>
    </>
  );
}

export function CounterCells({ stats }: { stats: PeriodStatsCounters }) {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  return (
    <>
      <td className="px-3 py-2">{formatCount(p.receivedPromotions)}</td>
      <td className="px-3 py-2">{formatCount(p.promotionsExportedToCsv)}</td>
      <td className="px-3 py-2 text-green-700">{formatCount(p.clientFacingCount)}</td>
      <td className="px-3 py-2 text-red-600">{formatCount(p.leftForDebugCount)}</td>
      <td className="px-3 py-2">{formatCount(p.cannotValidateCount)}</td>
      <td className="px-3 py-2">{formatCount(v.totalValidationsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.conclusionsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.errorsCount)}</td>
      <td className="px-3 py-2">{formatCount(v.botDetectionValidationCount)}</td>
      <td className="whitespace-nowrap px-3 py-2">{formatCost(v.totalValidationsCost)}</td>
    </>
  );
}

export function DayCounters({ stats }: { stats: PeriodStatsCounters }) {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Promotions</h2>
        <KVGrid
          rows={[
            ["Received", formatCount(p.receivedPromotions)],
            ["Exported to CSV", formatCount(p.promotionsExportedToCsv)],
            ["Total (finalized outcomes)", formatCount(p.totalPromotionsCount)],
            ["Client-facing", formatCount(p.clientFacingCount)],
            ["Left for debug", formatCount(p.leftForDebugCount)],
            ["Cannot validate", formatCount(p.cannotValidateCount)],
            ["Merchant automation issues", formatCount(p.merchantAutomationIssuesCount)],
          ]}
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Validations</h2>
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

export const COUNTER_COL_SPAN = 10;

export function DailyRows({
  series,
  dayHref,
}: {
  series: Array<PeriodStatsCounters & { date: string; finalized?: boolean }>;
  dayHref: (date: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Status</th>
            <CounterHeadings />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...series].reverse().map((row) => (
            <tr key={row.date} className="hover:bg-sky-50/50">
              <td className="whitespace-nowrap px-3 py-2">
                <Link href={dayHref(row.date)} className="text-sky-700 hover:underline">
                  {formatUtcDay(row.date)}
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-slate-500">
                {row.finalized ? "finalized" : "open"}
              </td>
              <CounterCells stats={row} />
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
    return <p className="text-sm text-slate-400">No monthly totals yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Month</th>
            <CounterHeadings />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...series].reverse().map((row) => (
            <tr key={row.yearMonth}>
              <td className="whitespace-nowrap px-3 py-2">{formatUtcMonth(row.yearMonth)}</td>
              <CounterCells stats={row} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
