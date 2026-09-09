import Link from "next/link";
import Pagination from "@/components/Pagination";
import {
  drillFilters,
  getBatchMeta,
  getReport,
  getReportClientIds,
  getReportDomains,
  parseReportSearch,
  previousPeriod,
  reportQueryString,
  reportSearchParams,
  daysBetween,
  sortBatchRowsByReceived,
  type ReportRow,
  type ReportFilters,
  type ReportTotals,
  type Outcome,
  type GroupBy,
} from "@/lib/reports";
import ReportsFilterBar from "@/components/reports/ReportsFilterBar";
import { ratesConfigured } from "@/lib/rates";
import { PAGE_SIZE } from "@/lib/queries";
import { formatCost, formatCount, formatDate, formatDuration } from "@/lib/format";
import { ValidationSplitBar } from "@/components/charts";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: "client", label: "Customer" },
  { value: "merchant", label: "Merchant" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "batch", label: "Batch" },
];

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-slate-400">{current === 0 ? "no change" : "new"}</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={up ? "text-green-700" : "text-red-600"}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs prev
    </span>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// Numbers on the report are the navigation: each links to the runs behind it.
function DrillCell({
  href,
  value,
  className = "",
}: {
  href: string;
  value: number;
  className?: string;
}) {
  if (value === 0) return <td className={`px-3 py-2 text-slate-300 ${className}`}>0</td>;
  return (
    <td className={`px-3 py-2 ${className}`}>
      <Link href={href} className="hover:underline">
        {formatCount(value)}
      </Link>
    </td>
  );
}

// A row label leads to the most useful next view for that dimension.
function rowHref(row: ReportRow, filters: ReportFilters): string | null {
  switch (filters.groupBy) {
    case "client":
      return `/stats/clients/${encodeURIComponent(row.key)}`;
    case "merchant":
      return `/stats/merchants/${encodeURIComponent(row.key)}`;
    case "day":
      return `/reports?${reportQueryString({ ...filters, from: row.key, to: row.key, groupBy: "client" })}`;
    case "month":
    case "year":
      return `/reports/runs?${reportQueryString({ ...filters, ...monthOrYearRange(row.key) })}`;
    case "batch":
      return row.key ? `/reports/runs?${reportQueryString(filters)}` : null;
    default:
      return null;
  }
}

function monthOrYearRange(key: string): { from: string; to: string } {
  if (/^\d{4}$/.test(key)) return { from: `${key}-01-01`, to: `${key}-12-31` };
  const [y, m] = key.split("-").map(Number);
  return {
    from: `${key}-01`,
    to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
}

function rowLabel(row: ReportRow, groupBy: string, names: Map<string, string>): string {
  if (groupBy === "client") return names.get(row.key) ?? row.key;
  if (groupBy === "batch") return row.key === "" ? "(no batch recorded)" : row.key;
  return row.key;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const filters = parseReportSearch(sp);
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const prev = previousPeriod(filters.from, filters.to);

  const [current, comparison, clientIds, domains] = await Promise.all([
    getReport(filters),
    getReport({ ...filters, ...prev }),
    getReportClientIds(),
    getReportDomains(),
  ]);

  // Batch rows gain receipt/delivery timings from the client CSV events.
  const isBatch = filters.groupBy === "batch";
  const batchMeta = isBatch
    ? await getBatchMeta(current.rows.map((r) => r.key))
    : new Map();
  const allRows = isBatch ? sortBatchRowsByReceived(current.rows, batchMeta) : current.rows;
  const pages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const rows = allRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const names = new Map<string, string>();
  const qs = reportQueryString(filters);
  const span = daysBetween(filters.from, filters.to);
  const showRevenue = ratesConfigured();

  const drill = (rowKey: string, outcome?: Outcome) =>
    `/reports/runs?${reportQueryString(drillFilters(filters, rowKey, outcome))}`;

  const t: ReportTotals = current.totals;
  const p: ReportTotals = comparison.totals;
  // Success = the run reached a verdict; valid and invalid both count.
  const successRate = t.runs > 0 ? (t.resolved / t.runs) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href={`/api/reports/summary?${qs}`}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
          >
            ↓ Download report (CSV)
          </a>
          <a
            href={`/api/reports/validations?${qs}`}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
          >
            ↓ Download validations (CSV)
          </a>
        </div>
      </div>

      <ReportsFilterBar
        clientIds={clientIds}
        domains={domains}
        from={filters.from}
        to={filters.to}
        groupBy={filters.groupBy}
        outcomes={filters.outcomes ?? []}
        selectedClients={filters.clientIds ?? []}
        selectedDomains={filters.domains ?? []}
      />

      <p className="text-xs text-slate-500">
        {filters.from} → {filters.to} ({span} day{span === 1 ? "" : "s"}) · compared with{" "}
        {prev.from} → {prev.to}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Records received"
          value={formatCount(t.imported)}
          sub={<Delta current={t.imported} previous={p.imported} />}
        />
        <Tile
          label="Promotions sent to client"
          value={formatCount(t.sentBack)}
          sub={<Delta current={t.sentBack} previous={p.sentBack} />}
        />
        <Tile
          label="LLM cost"
          value={formatCost(t.cost)}
          sub={<Delta current={t.cost} previous={p.cost} />}
        />
        <Tile
          label="Revenue estimate"
          value={t.revenue == null ? "—" : `$${t.revenue.toFixed(2)}`}
          sub={showRevenue ? "promotions sent × client rate" : "set CLIENT_VALIDATION_RATES"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Validation runs"
          value={formatCount(t.runs)}
          sub={<Delta current={t.runs} previous={p.runs} />}
        />
        <Tile
          label="Validation Results Reached"
          value={successRate == null ? "—" : `${successRate.toFixed(0)}%`}
          sub={`${formatCount(t.resolved)} of ${formatCount(t.runs)} reached a result`}
        />
      </div>

      {t.runs > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
            Validation runs — {formatCount(t.runs)}
          </p>
          <ValidationSplitBar
            runs={t.runs}
            clientFacing={t.clientFacing}
            automationIssues={t.automationIssues}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Break down by</span>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm w-fit">
          {GROUPS.map((g) => (
            <Link
              key={g.value}
              href={`/reports?${reportQueryString({ ...filters, groupBy: g.value })}`}
              className={`rounded-md px-3 py-1 ${
                filters.groupBy === g.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">
                {GROUPS.find((g) => g.value === filters.groupBy)?.label}
              </th>
              {isBatch && <th className="px-3 py-2">Received</th>}
              {isBatch && <th className="px-3 py-2">Delivered</th>}
              {isBatch && <th className="px-3 py-2">Turnaround</th>}
              <th className="px-3 py-2">Runs</th>
              <th className="px-3 py-2">Reached result</th>
              <th className="px-3 py-2">No result</th>
              <th className="px-3 py-2">Client-facing</th>
              <th className="px-3 py-2">Automation issues</th>
              <th className="px-3 py-2">Other</th>
              <th className="px-3 py-2">Avg time</th>
              <th className="px-3 py-2">Cost</th>
              {showRevenue && <th className="px-3 py-2">Revenue</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const href = rowHref(row, filters);
              return (
              <tr key={row.key} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {href ? (
                    <Link href={href} className="text-sky-700 hover:underline">
                      {rowLabel(row, filters.groupBy, names)}
                    </Link>
                  ) : (
                    rowLabel(row, filters.groupBy, names)
                  )}
                </td>
                {isBatch &&
                  (() => {
                    const m = batchMeta.get(row.key);
                    const turnaround =
                      m?.receivedAt && m?.deliveredAt ? m.deliveredAt - m.receivedAt : null;
                    return (
                      <>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {m?.receivedAt ? formatDate(m.receivedAt) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {m?.deliveredAt ? formatDate(m.deliveredAt) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">
                          {turnaround == null ? "—" : formatDuration(turnaround)}
                        </td>
                      </>
                    );
                  })()}
                <DrillCell href={drill(row.key)} value={row.runs} />
                <td className="px-3 py-2">{formatCount(row.resolved)}</td>
                <DrillCell
                  href={drill(row.key, "no_result")}
                  value={row.noResult}
                  className="text-amber-700"
                />
                <td className="px-3 py-2 text-green-700">{formatCount(row.clientFacing)}</td>
                <td className="px-3 py-2 text-orange-700">{formatCount(row.automationIssues)}</td>
                <td className="px-3 py-2 text-slate-600">{formatCount(row.other)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {row.timedRuns === 0 ? "—" : `${(row.avgTimeMs / 1000).toFixed(1)}s`}
                  {row.timedRuns > 0 && row.timedRuns < row.runs && (
                    <span className="ml-1 text-xs text-slate-400">({row.timedRuns})</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{formatCost(row.cost)}</td>
                {showRevenue && (
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.revenue == null ? "—" : `$${row.revenue.toFixed(2)}`}
                  </td>
                )}
              </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={(showRevenue ? 10 : 9) + (isBatch ? 3 : 0)}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  No validations in this range.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                {isBatch && <td colSpan={3} className="px-3 py-2" />}
                <td className="px-3 py-2">{formatCount(t.runs)}</td>
                <td className="px-3 py-2">{formatCount(t.resolved)}</td>
                <td className="px-3 py-2">{formatCount(t.noResult)}</td>
                <td className="px-3 py-2">{formatCount(t.clientFacing)}</td>
                <td className="px-3 py-2">{formatCount(t.automationIssues)}</td>
                <td className="px-3 py-2">{formatCount(t.other)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {t.timedRuns === 0 ? "—" : `${(t.avgTimeMs / 1000).toFixed(1)}s`}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{formatCost(t.cost)}</td>
                {showRevenue && (
                  <td className="whitespace-nowrap px-3 py-2">
                    {t.revenue == null ? "—" : `$${t.revenue.toFixed(2)}`}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pages > 1 && (
        <Pagination
          page={safePage}
          pages={pages}
          total={allRows.length}
          basePath="/reports"
          params={reportSearchParams(filters)}
        />
      )}

      <p className="text-xs text-slate-400">
        Click any count to see the individual validations behind it, with reasons and
        screenshots. Counts are validation runs from the job logs; “Client-facing” is a
        conclusion the client can act on (the promotion worked, or it failed with a
        client-facing fail code); “Automation issues” are runs whose fail codes are
        automation failures (bot detection, agent errors, proxy, timeouts); “Other”
        is the remainder of validation runs (including no-result runs and conclusions
        that are neither client-facing nor automation failures). “Client Records”
        is import-file records received from the client versus promotions in export
        files sent back in this period. Revenue is a crude estimate (promotions sent
        to the client × per-client rate) and ignores
        contractual terms. Average time covers only runs with a usable duration —
        {" "}
        {t.runs - t.timedRuns > 0
          ? `${formatCount(t.runs - t.timedRuns)} run(s) in this range record a timestamp instead of an elapsed time and are excluded`
          : "all runs in this range have one"}
        .
      </p>
    </div>
  );
}
