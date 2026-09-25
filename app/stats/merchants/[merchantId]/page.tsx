import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyCharts } from "@/components/stats/DailyCharts";
import { CounterTiles } from "@/components/stats/CounterTiles";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass, DailyRows, MonthlyRows } from "@/components/stats/CountersTable";
import MerchantBotDetectionActions from "@/components/ops/MerchantBotDetectionActions";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import { formatUtcDay, formatUtcMonth } from "@/lib/format";
import {
  merchantHighlight,
  merchantHighlightLabel,
} from "@/lib/merchant-status";
import { isOpsConfigured } from "@/lib/ops-config";
import { isZeroPeriodStats, periodFromSearch, periodPromotionOutcomesPending } from "@/lib/stats-model";
import { getClientNames, getDailySeries, getMerchantClientBreakdown, getMerchantFlags, getMonthlySeries, getPeriodTotals, getStatMerchant } from "@/lib/stats-queries";

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
  const [totals, daily, monthly, clients, names, flags] = await Promise.all([
    getPeriodTotals(period, match),
    getDailySeries(match),
    getMonthlySeries(match),
    getMerchantClientBreakdown(merchantId, period),
    getClientNames(),
    getMerchantFlags([merchantId]),
  ]);
  const merchantFlags = flags.get(merchantId) ?? {};
  const highlight = merchantHighlight(merchantFlags);
  const opsConfigured = isOpsConfigured();
  const pendingPromotionOutcomes = periodPromotionOutcomesPending(period, daily);
  const periodLabel =
    period.granularity === "day"
      ? formatUtcDay(period.date)
      : period.granularity === "month"
        ? formatUtcMonth(period.yearMonth)
        : "all time";
  const dayDetailHref =
    period.granularity === "day"
      ? `/stats/merchants/${encodeURIComponent(merchantId)}/days/${period.date}`
      : undefined;
  const title = merchant.merchantDomain || merchantId;

  return (
    <div className="space-y-4">
      <div>
        <Link href={periodHref("/stats/merchants", period)} className="text-sm text-primary-ink hover:underline">
          ← Back to merchants
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
        <p className="text-xs text-muted font-mono">{merchantId}</p>
        {merchant.merchantName && <p className="text-sm text-muted">{merchant.merchantName}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-sm">
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${
                highlight === "bot-detected"
                  ? "bg-bad"
                  : highlight === "onboarded"
                    ? "bg-ok"
                    : "bg-line"
              }`}
            />
            <span
              className={
                highlight === "bot-detected"
                  ? "text-bad"
                  : highlight === "onboarded"
                    ? "text-ok"
                    : "text-muted"
              }
            >
              {merchantHighlightLabel(highlight)}
            </span>
          </span>
          {opsConfigured && (
            <MerchantBotDetectionActions
              merchantId={merchantId}
              domain={merchant.merchantDomain || merchantId}
              botDetected={highlight === "bot-detected"}
              botDetectionFixed={merchantFlags.fixedBotDetection === true}
              layout="block"
            />
          )}
        </div>
      </div>

      <PeriodToolbar
        basePath={`/stats/merchants/${encodeURIComponent(merchantId)}`}
        period={period}
        showAllPeriod
      />

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
        <CounterTiles stats={totals} pendingPromotionOutcomes={pendingPromotionOutcomes} />
      )}

      <DailyCharts series={daily} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Last 30 days</h2>
        <DailyRows
          series={daily}
          dayHref={(date) => `/stats/merchants/${encodeURIComponent(merchantId)}/days/${date}`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Monthly totals</h2>
        <MonthlyRows series={monthly} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Clients in {periodLabel}</h2>
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
                      href={periodHref(`/stats/clients/${encodeURIComponent(row.clientId)}`, period)}
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
