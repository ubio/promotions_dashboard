import Link from "next/link";
import { notFound } from "next/navigation";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass, DayCounters } from "@/components/stats/CountersTable";
import { formatUtcDay } from "@/lib/format";
import { isIsoDate, last30DateRange, type StatsPeriod } from "@/lib/stats-model";
import {
  getClientNames,
  getMerchantClientBreakdown,
  getPeriodTotals,
  getStatMerchant,
  isDayFinalized,
} from "@/lib/stats-queries";

export const dynamic = "force-dynamic";

export default async function MerchantDayStatsPage({
  params,
}: {
  params: Promise<{ merchantId: string; date: string }>;
}) {
  const { merchantId, date } = await params;
  if (!isIsoDate(date)) notFound();
  const merchant = await getStatMerchant(merchantId);
  if (!merchant) notFound();

  const { from, to } = last30DateRange();
  const inWindow = date >= from && date <= to;
  const period: StatsPeriod = { granularity: "day", date, yearMonth: date.slice(0, 7) };
  const [totals, clients, names, dayFinalized] = inWindow
    ? await Promise.all([
        getPeriodTotals(period, { merchantId }),
        getMerchantClientBreakdown(merchantId, period),
        getClientNames(),
        isDayFinalized(date, { merchantId }),
      ])
    : [null, [], await getClientNames(), false];
  const pendingPromotionOutcomes = !dayFinalized;
  const title = merchant.merchantDomain || merchantId;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/stats/merchants/${encodeURIComponent(merchantId)}?granularity=day&date=${date}`}
          className="text-sm text-primary-ink hover:underline"
        >
          ← Back to {title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {title}
          <span className="ml-2 text-base font-normal text-muted">{formatUtcDay(date)}</span>
        </h1>
        <p className="text-xs text-muted font-mono">{merchantId}</p>
      </div>

      {!inWindow || totals == null ? (
        <p className="rounded-lg border border-line bg-card px-4 py-6 text-sm text-muted">
          Daily detail is only stored for the last 30 days ({from} to {to}). Older totals live on the
          monthly view.
        </p>
      ) : (
        <>
          <CounterTiles stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
          <DayCounters stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text">Clients</h2>
            <div className="overflow-x-auto rounded-lg border border-line bg-card">
              <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
                <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
                  <CounterTableHead leading={<th rowSpan={2} className={counterThClass}>Client</th>} />
                </thead>
                <tbody className="divide-y divide-rule">
                  {clients.map((row) => (
                    <tr key={row.clientId} className="hover:bg-tint">
                      <td className="px-3 py-2">
                        <Link
                          href={`/stats/clients/${encodeURIComponent(row.clientId)}/days/${date}`}
                          className="font-medium text-primary-ink hover:underline"
                        >
                          {row.clientId}
                        </Link>
                        {names.get(row.clientId) && names.get(row.clientId) !== row.clientId && (
                          <div className="text-xs text-muted">{names.get(row.clientId)}</div>
                        )}
                      </td>
                      <CounterCells stats={row} pendingPromotionOutcomes={pendingPromotionOutcomes} />
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={1 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-faint">
                        No client activity on this day.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
