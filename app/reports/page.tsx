import Link from "next/link";
import {
  drillFilters,
  getReport,
  getReportClientIds,
  getReportDomains,
  parseReportSearch,
  previousPeriod,
  reportQueryString,
  daysBetween,
  type ReportRow,
  type ReportTotals,
  type Outcome,
} from "@/lib/reports";
import ReportsFilterBar from "@/components/reports/ReportsFilterBar";
import { ratesConfigured } from "@/lib/rates";
import { formatCost, formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const GROUPS: { value: string; label: string }[] = [
  { value: "client", label: "Customer" },
  { value: "merchant", label: "Merchant" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
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

function rowLabel(row: ReportRow, groupBy: string, names: Map<string, string>): string {
  if (groupBy === "client") return names.get(row.key) ?? row.key;
  return row.key;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const filters = parseReportSearch(sp);
  const prev = previousPeriod(filters.from, filters.to);

  const [current, comparison, clientIds, domains] = await Promise.all([
    getReport(filters),
    getReport({ ...filters, ...prev }),
    getReportClientIds(),
    getReportDomains(),
  ]);

  const names = new Map<string, string>();
  const qs = reportQueryString(filters);
  const span = daysBetween(filters.from, filters.to);
  const showRevenue = ratesConfigured();

  const drill = (rowKey: string, outcome?: Outcome) =>
    `/reports/runs?${reportQueryString(drillFilters(filters, rowKey, outcome))}`;

  const t: ReportTotals = current.totals;
  const p: ReportTotals = comparison.totals;
  const passRate = t.conclusions > 0 ? (t.passed / t.conclusions) * 100 : null;

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile
          label="Validation runs"
          value={formatCount(t.runs)}
          sub={<Delta current={t.runs} previous={p.runs} />}
        />
        <Tile
          label="Distinct codes"
          value={formatCount(t.distinctCodes)}
          sub={`${formatCount(t.distinctPromotions)} promotions`}
        />
        <Tile
          label="Passed"
          value={formatCount(t.passed)}
          sub={passRate == null ? "no conclusions" : `${passRate.toFixed(0)}% of conclusions`}
        />
        <Tile
          label="LLM cost"
          value={formatCost(t.cost)}
          sub={<Delta current={t.cost} previous={p.cost} />}
        />
        <Tile
          label={showRevenue ? "Revenue estimate" : "Revenue estimate"}
          value={t.revenue == null ? "—" : `$${t.revenue.toFixed(2)}`}
          sub={showRevenue ? "passed × client rate" : "set CLIENT_VALIDATION_RATES"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Break down by</span>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm w-fit">
          {GROUPS.map((g) => (
            <Link
              key={g.value}
              href={`/reports?${reportQueryString({ ...filters, groupBy: g.value as typeof filters.groupBy })}`}
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
              <th className="px-3 py-2">Runs</th>
              <th className="px-3 py-2">Conclusions</th>
              <th className="px-3 py-2">Errors</th>
              <th className="px-3 py-2">Passed</th>
              <th className="px-3 py-2">Failed</th>
              <th className="px-3 py-2">Codes</th>
              <th className="px-3 py-2">Avg time</th>
              <th className="px-3 py-2">Cost</th>
              {showRevenue && <th className="px-3 py-2">Revenue</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {current.rows.map((row) => (
              <tr key={row.key} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {rowLabel(row, filters.groupBy, names)}
                </td>
                <DrillCell href={drill(row.key)} value={row.runs} />
                <td className="px-3 py-2">{formatCount(row.conclusions)}</td>
                <DrillCell
                  href={drill(row.key, "errored")}
                  value={row.errors}
                  className="text-amber-700"
                />
                <DrillCell
                  href={drill(row.key, "passed")}
                  value={row.passed}
                  className="text-green-700"
                />
                <DrillCell
                  href={drill(row.key, "failed")}
                  value={row.failed}
                  className="text-red-600"
                />
                <td className="px-3 py-2">{formatCount(row.distinctCodes)}</td>
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
            ))}
            {current.rows.length === 0 && (
              <tr>
                <td colSpan={showRevenue ? 10 : 9} className="px-3 py-8 text-center text-slate-400">
                  No validations in this range.
                </td>
              </tr>
            )}
          </tbody>
          {current.rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2">{formatCount(t.runs)}</td>
                <td className="px-3 py-2">{formatCount(t.conclusions)}</td>
                <td className="px-3 py-2">{formatCount(t.errors)}</td>
                <td className="px-3 py-2">{formatCount(t.passed)}</td>
                <td className="px-3 py-2">{formatCount(t.failed)}</td>
                <td className="px-3 py-2">{formatCount(t.distinctCodes)}</td>
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

      <p className="text-xs text-slate-400">
        Click any count to see the individual validations behind it, with reasons and
        screenshots. Counts are validation runs from the job logs; “Codes” is distinct promotion codes touched in
        the period. Revenue is a crude estimate (passed runs × per-client rate) and ignores
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
