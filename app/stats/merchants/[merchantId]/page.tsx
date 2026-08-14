import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyCharts } from "@/components/stats/DailyCharts";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterHeadings, COUNTER_COL_SPAN, DailyRows, MonthlyRows } from "@/components/stats/CountersTable";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import { formatUtcDay, formatUtcMonth } from "@/lib/format";
import { getClientNames, getDailySeries, getMerchantClientBreakdown, getMonthlySeries, getPeriodTotals, getStatMerchant } from "@/lib/stats-queries";
import { isZeroPeriodStats, periodFromSearch } from "@/lib/stats-model";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

export default async function MerchantStatsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ merchantId: string }>;
  searchParams: Promise<Search>;
}) {
  const { merchantId } = await params;
  const sp = await searchParams;
  const period = periodFromSearch(sp);
  const merchant = await getStatMerchant(merchantId);
  if (!merchant) notFound();

  const match = { merchantId };
  const [totals, daily, monthly, clients, names] = await Promise.all([
    getPeriodTotals(period, match),
    getDailySeries(match),
    getMonthlySeries(match),
    getMerchantClientBreakdown(merchantId, period),
    getClientNames(),
  ]);
  const periodLabel =
    period.granularity === "day" ? formatUtcDay(period.date) : formatUtcMonth(period.yearMonth);
  const dayDetailHref =
    period.granularity === "day"
      ? `/stats/merchants/${encodeURIComponent(merchantId)}/days/${period.date}`
      : undefined;
  const title = merchant.merchantDomain || merchantId;

  return (
    <div className="space-y-4">
      <div>
        <Link href={periodHref("/stats/merchants", period)} className="text-sm text-sky-700 hover:underline">
          ← Back to merchants
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
        <p className="text-xs text-slate-500 font-mono">{merchantId}</p>
        {merchant.merchantName && <p className="text-sm text-slate-500">{merchant.merchantName}</p>}
      </div>

      <PeriodToolbar basePath={`/stats/merchants/${encodeURIComponent(merchantId)}`} period={period} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-500">Selected period: {periodLabel}</p>
        {dayDetailHref && (
          <Link href={dayDetailHref} className="text-sm text-sky-700 hover:underline">
            Open detailed day view
          </Link>
        )}
      </div>

      {isZeroPeriodStats(totals) ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
          No activity for this period.
        </p>
      ) : (
        <CounterTiles stats={totals} />
      )}

      <DailyCharts series={daily} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Last 30 days</h2>
        <DailyRows
          series={daily}
          dayHref={(date) => `/stats/merchants/${encodeURIComponent(merchantId)}/days/${date}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Monthly totals</h2>
        <MonthlyRows series={monthly} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Clients in {periodLabel}</h2>
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
                      href={periodHref(`/stats/clients/${encodeURIComponent(row.clientId)}`, period)}
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
                    No client activity for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
