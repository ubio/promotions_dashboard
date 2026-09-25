import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyCharts } from "@/components/stats/DailyCharts";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass, DailyRows, MonthlyRows, PeriodSummaryTable } from "@/components/stats/CountersTable";
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
  const periodStatus =
    period.granularity === "day"
      ? daily.find((day) => day.date === period.date)?.finalized === true
        ? "finalized"
        : "open"
      : undefined;
  const dayDetailHref =
    period.granularity === "day"
      ? `/stats/clients/${encodeURIComponent(clientId)}/days/${period.date}`
      : undefined;

  return (
    <div className="space-y-4">
      <div>
        <Link href={periodHref("/stats/clients", period)} className="text-sm text-primary-ink hover:underline">
          ← Back to clients
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{clientId}</h1>
        {name && name !== clientId && <p className="text-sm text-muted">{name}</p>}
      </div>

      <PeriodToolbar basePath={`/stats/clients/${encodeURIComponent(clientId)}`} period={period} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">Selected period: {periodLabel}</p>
        {dayDetailHref && (
          <Link href={dayDetailHref} className="text-sm text-primary-ink hover:underline">
            Open detailed day view
          </Link>
        )}
      </div>

      {isZeroPeriodStats(totals) ? (
        <p className="rounded-lg border border-line bg-card px-4 py-6 text-center text-sm text-faint">
          No activity for this period.
        </p>
      ) : (
        <PeriodSummaryTable
          label={periodLabel}
          status={periodStatus}
          stats={totals}
          pendingPromotionOutcomes={pendingPromotionOutcomes}
        />
      )}

      <DailyCharts series={daily} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Last 30 days</h2>
        <DailyRows
          series={daily}
          dayHref={(date) => `/stats/clients/${encodeURIComponent(clientId)}/days/${date}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Monthly totals</h2>
        <MonthlyRows series={monthly} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Merchants in {periodLabel}</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
              <CounterTableHead leadingDivider leading={<th rowSpan={2} className={counterThClass}>Merchant</th>} />
            </thead>
            <tbody className="divide-y divide-rule">
              {merchants.map((row) => (
                <tr key={row.merchantId} className="hover:bg-tint">
                  <td className="px-3 py-2">
                    <Link
                      href={periodHref(`/stats/merchants/${encodeURIComponent(row.merchantId)}`, period)}
                      className="font-mono text-xs text-primary-ink hover:underline"
                    >
                      {row.merchantDomain || row.merchantId}
                    </Link>
                    {row.merchantName && (
                      <div className="text-xs text-muted">{row.merchantName}</div>
                    )}
                  </td>
                  <CounterCells stats={row} leadingDivider pendingPromotionOutcomes={pendingPromotionOutcomes} />
                </tr>
              ))}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={1 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-faint">
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
