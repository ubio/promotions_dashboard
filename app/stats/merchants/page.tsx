import Link from "next/link";
import MerchantBotDetectionActions from "@/components/ops/MerchantBotDetectionActions";
import Pagination from "@/components/Pagination";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass } from "@/components/stats/CountersTable";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import {
  merchantHighlight,
  merchantHighlightClass,
  merchantHighlightLabel,
  parseMerchantStatus,
} from "@/lib/merchant-status";
import { isOpsConfigured } from "@/lib/ops-config";
import { firstParam, periodFromSearch } from "@/lib/stats-model";
import { getMerchantFlags, getMerchantPeriodRows, isDayFinalized } from "@/lib/stats-queries";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

export default async function MerchantStatsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const period = periodFromSearch(sp);
  const q = firstParam(sp.q);
  const status = parseMerchantStatus(firstParam(sp.status));
  const page = Number(firstParam(sp.page) ?? "1") || 1;
  const [result, dayFinalized] = await Promise.all([
    getMerchantPeriodRows(period, { q, page, status }),
    period.granularity === "day" ? isDayFinalized(period.date) : true,
  ]);
  const pendingPromotionOutcomes = period.granularity === "day" && !dayFinalized;
  const flags = await getMerchantFlags(result.items.map((r) => r.merchantId));
  const opsConfigured = isOpsConfigured();
  const queryParams: Record<string, string | undefined> = {
    granularity: period.granularity,
    date: period.granularity === "day" ? period.date : undefined,
    yearMonth: period.granularity === "month" ? period.yearMonth : undefined,
    q,
    status,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Merchant stats</h1>
        <p className="text-sm text-muted">
          Counters from the stats collection, rolled up across every client for each merchant.
        </p>
      </div>

      <PeriodToolbar
        basePath="/stats/merchants"
        period={period}
        q={q ?? ""}
        status={status ?? ""}
        showAllPeriod
      />

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
            <CounterTableHead
              leadingDivider
              leading={
                <>
                  <th rowSpan={2} className={counterThClass}>
                    Merchant
                  </th>
                  <th rowSpan={2} className={counterThClass}>
                    Status
                  </th>
                  {opsConfigured && (
                    <th rowSpan={2} className={counterThClass}>
                      Actions
                    </th>
                  )}
                  <th rowSpan={2} className={counterThClass}>
                    Clients
                  </th>
                </>
              }
            />
          </thead>
          <tbody className="divide-y divide-rule">
            {result.items.map((row) => {
              const merchantFlags = flags.get(row.merchantId) ?? {};
              const highlight = merchantHighlight(merchantFlags);
              return (
              <tr key={row.merchantId} className={merchantHighlightClass(highlight)}>
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
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs">
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
                            : "text-faint"
                      }
                    >
                      {merchantHighlightLabel(highlight)}
                    </span>
                  </span>
                </td>
                {opsConfigured && (
                  <td className="px-3 py-2">
                    <MerchantBotDetectionActions
                      merchantId={row.merchantId}
                      domain={row.merchantDomain || row.merchantId}
                      botDetected={highlight === "bot-detected"}
                      botDetectionFixed={merchantFlags.fixedBotDetection === true}
                    />
                  </td>
                )}
                <td className="px-3 py-2">{row.clientCount}</td>
                <CounterCells stats={row} leadingDivider pendingPromotionOutcomes={pendingPromotionOutcomes} />
              </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={(opsConfigured ? 4 : 3) + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-faint">
                  No merchants match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={result.page}
        pages={result.pages}
        total={result.total}
        basePath="/stats/merchants"
        params={queryParams}
      />
    </div>
  );
}
