import Link from "next/link";
import Pagination from "@/components/Pagination";
import { CounterCells, CounterTableHead, COUNTER_COL_SPAN, counterThClass } from "@/components/stats/CountersTable";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import { firstParam, periodFromSearch } from "@/lib/stats-model";
import { getMerchantFlags, getMerchantPeriodRows, isDayFinalized } from "@/lib/stats-queries";
import {
  merchantHighlight,
  merchantHighlightClass,
  merchantHighlightLabel,
  parseMerchantStatus,
} from "@/lib/merchant-status";

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
        <p className="text-sm text-slate-500">
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
                  <th rowSpan={2} className={counterThClass}>
                    Clients
                  </th>
                </>
              }
            />
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((row) => {
              const highlight = merchantHighlight(flags.get(row.merchantId) ?? {});
              return (
              <tr key={row.merchantId} className={merchantHighlightClass(highlight)}>
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
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 rounded-full ${
                        highlight === "bot-detected"
                          ? "bg-red-500"
                          : highlight === "onboarded"
                            ? "bg-green-600"
                            : "bg-slate-300"
                      }`}
                    />
                    <span
                      className={
                        highlight === "bot-detected"
                          ? "text-red-700"
                          : highlight === "onboarded"
                            ? "text-green-700"
                            : "text-slate-400"
                      }
                    >
                      {merchantHighlightLabel(highlight)}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2">{row.clientCount}</td>
                <CounterCells stats={row} leadingDivider pendingPromotionOutcomes={pendingPromotionOutcomes} />
              </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={3 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-slate-400">
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
