import Link from "next/link";
import {
  getReport,
  getReportClientIds,
  getReportDomains,
  parseReportSearch,
  previousPeriod,
  reportQueryString,
  daysBetween,
  shiftDate,
  type ReportRow,
  type ReportTotals,
} from "@/lib/reports";
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

function monthStart(offset = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    .toISOString()
    .slice(0, 10);
}

function monthEnd(offset = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function presets(): { label: string; from: string; to: string }[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "Last 30 days", from: shiftDate(today, -29), to: today },
    { label: "This month", from: monthStart(), to: today },
    { label: "Last month", from: monthStart(-1), to: monthEnd(-1) },
    { label: "This year", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

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
            ⭳ Download report (CSV)
          </a>
          <a
            href={`/api/reports/validations?${qs}`}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100"
          >
            ⭳ Download validations (CSV)
          </a>
        </div>
      </div>

      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">From</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className="max-w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">To</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className="max-w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">Group by</span>
            <select
              name="groupBy"
              defaultValue={filters.groupBy}
              className="max-w-full rounded border border-slate-300 px-2 py-1.5"
            >
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">Outcome</span>
            <select
              name="outcome"
              defaultValue={filters.outcome ?? ""}
              className="max-w-full rounded border border-slate-300 px-2 py-1.5"
            >
              <option value="">All</option>
              <option value="passed">Passed only</option>
              <option value="failed">Failed only</option>
              <option value="errored">Errored only</option>
            </select>
          </label>
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">Customers (none = all)</span>
            <select
              name="clientIds"
              multiple
              size={Math.min(3, Math.max(2, clientIds.length))}
              defaultValue={filters.clientIds ?? []}
              className="max-w-full rounded border border-slate-300 px-2 py-1"
            >
              {clientIds.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-slate-500">Merchants (comma separated)</span>
            <input
              name="domains"
              list="report-domains"
              defaultValue={(filters.domains ?? []).join(",")}
              placeholder="e.g. petsmart.com"
              className="w-64 max-w-full rounded border border-slate-300 px-2 py-1.5"
            />
            <datalist id="report-domains">
              {domains.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </label>
          <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">
            Apply
          </button>
          <Link href="/reports" className="py-1.5 text-slate-500 hover:text-slate-700">
            Reset
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="py-1 text-slate-400">Quick range:</span>
          {presets().map((preset) => (
            <Link
              key={preset.label}
              href={`/reports?from=${preset.from}&to=${preset.to}&groupBy=${filters.groupBy}`}
              className="rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100"
            >
              {preset.label}
            </Link>
          ))}
        </div>
      </form>

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
                <td className="px-3 py-2">{formatCount(row.runs)}</td>
                <td className="px-3 py-2">{formatCount(row.conclusions)}</td>
                <td className="px-3 py-2 text-amber-700">{formatCount(row.errors)}</td>
                <td className="px-3 py-2 text-green-700">{formatCount(row.passed)}</td>
                <td className="px-3 py-2 text-red-600">{formatCount(row.failed)}</td>
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
        Counts are validation runs from the job logs; “Codes” is distinct promotion codes touched in
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
