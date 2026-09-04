import Link from "next/link";
import { notFound } from "next/navigation";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass, DayCounters } from "@/components/stats/CountersTable";
import { formatUtcDay } from "@/lib/format";
import { isIsoDate, last30DateRange, type StatsPeriod } from "@/lib/stats-model";
import {
  clientHasStats,
  getClientMerchantBreakdown,
  getClientNames,
  getPeriodTotals,
  isDayFinalized,
} from "@/lib/stats-queries";

export const dynamic = "force-dynamic";

export default async function ClientDayStatsPage({
  params,
}: {
  params: Promise<{ clientId: string; date: string }>;
}) {
  const { clientId, date } = await params;
  if (!isIsoDate(date)) notFound();
  if (!(await clientHasStats(clientId))) notFound();

  const { from, to } = last30DateRange();
  const inWindow = date >= from && date <= to;
  const period: StatsPeriod = { granularity: "day", date, yearMonth: date.slice(0, 7) };
  const [totals, merchants, names, dayFinalized] = inWindow
    ? await Promise.all([
        getPeriodTotals(period, { clientId }),
        getClientMerchantBreakdown(clientId, period),
        getClientNames(),
        isDayFinalized(date, { clientId }),
      ])
    : [null, [], await getClientNames(), false];
  const pendingPromotionOutcomes = !dayFinalized;
  const name = names.get(clientId);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/stats/clients/${encodeURIComponent(clientId)}?granularity=day&date=${date}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Back to {clientId}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {clientId}
          <span className="ml-2 text-base font-normal text-slate-500">{formatUtcDay(date)}</span>
        </h1>
        {name && name !== clientId && <p className="text-sm text-slate-500">{name}</p>}
      </div>

      {!inWindow || totals == null ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          Daily detail is only stored for the last 30 days ({from} to {to}). Older totals live on the
          monthly view.
        </p>
      ) : (
        <>
          <CounterTiles stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
          <DayCounters stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Merchants</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <CounterTableHead leadingDivider leading={<th rowSpan={2} className={counterThClass}>Merchant</th>} />
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchants.map((row) => (
                    <tr key={row.merchantId} className="hover:bg-sky-50/50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/stats/merchants/${encodeURIComponent(row.merchantId)}/days/${date}`}
                          className="font-mono text-xs text-sky-700 hover:underline"
                        >
                          {row.merchantDomain || row.merchantId}
                        </Link>
                      </td>
                      <CounterCells stats={row} leadingDivider pendingPromotionOutcomes={pendingPromotionOutcomes} />
                    </tr>
                  ))}
                  {merchants.length === 0 && (
                    <tr>
                      <td colSpan={1 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-slate-400">
                        No merchant activity on this day.
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
