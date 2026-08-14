import Link from "next/link";
import Pagination from "@/components/Pagination";
import { CounterCells, CounterHeadings, COUNTER_COL_SPAN } from "@/components/stats/CountersTable";
import { PeriodToolbar, periodHref } from "@/components/stats/PeriodToolbar";
import { firstParam, periodFromSearch } from "@/lib/stats-model";
import { getMerchantPeriodRows } from "@/lib/stats-queries";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

export default async function MerchantStatsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const period = periodFromSearch(sp);
  const q = firstParam(sp.q);
  const page = Number(firstParam(sp.page) ?? "1") || 1;
  const result = await getMerchantPeriodRows(period, { q, page });
  const queryParams: Record<string, string | undefined> = {
    granularity: period.granularity,
    date: period.granularity === "day" ? period.date : undefined,
    yearMonth: period.granularity === "month" ? period.yearMonth : undefined,
    q,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Merchant stats</h1>
        <p className="text-sm text-slate-500">
          Counters from the stats collection, rolled up across every client for each merchant.
        </p>
      </div>

      <PeriodToolbar basePath="/stats/merchants" period={period} q={q ?? ""} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Clients</th>
              <CounterHeadings />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((row) => (
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
                <td className="px-3 py-2">{row.clientCount}</td>
                <CounterCells stats={row} />
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={2 + COUNTER_COL_SPAN} className="px-3 py-8 text-center text-slate-400">
                  No merchant stats for this period.
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
