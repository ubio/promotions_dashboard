import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyCharts } from "@/components/stats/DailyCharts";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass, DailyRows, MonthlyRows } from "@/components/stats/CountersTable";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import { formatUtcDay, formatUtcMonth } from "@/lib/format";
import { clientHasStats, getClientMerchantBreakdown, getClientNames, getDailySeries, getMonthlySeries, getPeriodTotals } from "@/lib/stats-queries";
import { isZeroPeriodStats, periodFromSearch, periodPromotionOutcomesPending } from "@/lib/stats-model";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

export default async function ClientStatsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<Search>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const period = periodFromSearch(sp);

  if (!(await clientHasStats(clientId))) notFound();

  const match = { clientId };
  const [totals, daily, monthly, merchants, names] = await Promise.all([
    getPeriodTotals(period, match),
    getDailySeries(match),
    getMonthlySeries(match),
    getClientMerchantBreakdown(clientId, period),
    getClientNames(),
  ]);
  const pendingPromotionOutcomes = periodPromotionOutcomesPending(period, daily);
  const name = names.get(clientId);
  const periodLabel =
    period.granularity === "day" ? formatUtcDay(period.date) : formatUtcMonth(period.yearMonth);
  const dayDetailHref =
    period.granularity === "day"
      ? `/stats/clients/${encodeURIComponent(clientId)}/days/${period.date}`
      : undefined;

  return (
    <div className="space-y-4">
      <div>
        <Link href={periodHref("/stats/clients", period)} className="text-sm text-sky-700 hover:underline">
          ← Back to clients
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{clientId}</h1>
        {name && name !== clientId && <p className="text-sm text-slate-500">{name}</p>}
      </div>

      <PeriodToolbar basePath={`/stats/clients/${encodeURIComponent(clientId)}`} period={period} />

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
        <CounterTiles stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
      )}

      <DailyCharts series={daily} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Last 30 days</h2>
        <DailyRows
          series={daily}
          dayHref={(date) => `/stats/clients/${encodeURIComponent(clientId)}/days/${date}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Monthly totals</h2>
        <MonthlyRows series={monthly} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Merchants in {periodLabel}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <CounterTableHead leading={<th rowSpan={2} className={counterThClass}>Merchant</th>} />
            </thead>
            <tbody className="divide-y divide-slate-100">
              {merchants.map((row) => (
                <tr key={row.merchantId} className="hover:bg-sky-50/50">
                  <td className="px-3 py-2">
                    <Link
                      href={periodHref(`/stats/merchants/${encodeURIComponent(row.merchantId)}`, period)}
                      className="font-mono text-xs text-sky-700 hover:underline"
                    >
                      {row.merchantDomain || row.merchantId}
                    </Link>
                    {row.merchantName && (
                      <div className="text-xs text-slate-500">{row.merchantName}</div>
                    )}
                  </td>
                  <CounterCells stats={row} pendingPromotionOutcomes={pendingPromotionOutcomes} />
                </tr>
              ))}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={1 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-slate-400">
                    No merchant activity for this period.
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
