import Link from "next/link";
import { notFound } from "next/navigation";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterHeadings, COUNTER_COL_SPAN, DayCounters } from "@/components/stats/CountersTable";
import { formatUtcDay } from "@/lib/format";
import { isIsoDate, last30DateRange, type StatsPeriod } from "@/lib/stats-model";
import {
  getClientNames,
  getMerchantClientBreakdown,
  getPeriodTotals,
  getStatMerchant,
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
  const [totals, clients, names] = inWindow
    ? await Promise.all([
        getPeriodTotals(period, { merchantId }),
        getMerchantClientBreakdown(merchantId, period),
        getClientNames(),
      ])
    : [null, [], await getClientNames()];
  const title = merchant.merchantDomain || merchantId;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/stats/merchants/${encodeURIComponent(merchantId)}?granularity=day&date=${date}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Back to {title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {title}
          <span className="ml-2 text-base font-normal text-slate-500">{formatUtcDay(date)}</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono">{merchantId}</p>
      </div>

      {!inWindow || totals == null ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          Daily detail is only stored for the last 30 days ({from} to {to}). Older totals live on the
          monthly view.
        </p>
      ) : (
        <>
          <CounterTiles stats={totals} />
          <DayCounters stats={totals} />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Clients</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <CounterHeadings />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((row) => (
                    <tr key={row.clientId} className="hover:bg-sky-50/50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/stats/clients/${encodeURIComponent(row.clientId)}/days/${date}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {row.clientId}
                        </Link>
                        {names.get(row.clientId) && names.get(row.clientId) !== row.clientId && (
                          <div className="text-xs text-slate-500">{names.get(row.clientId)}</div>
                        )}
                      </td>
                      <CounterCells stats={row} />
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={1 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-slate-400">
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
