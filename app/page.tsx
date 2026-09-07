import Link from "next/link";
import { StackedOutcomeChart, ValidityBar } from "@/components/charts";
import {
  getReport,
  getDailySeriesForOverview,
  getFailCodeBreakdown,
  getValidityForPeriod,
  previousPeriod,
  reportQueryString,
  shiftDate,
  type ReportFilters,
} from "@/lib/reports";
import { ratesConfigured } from "@/lib/rates";
import { formatCost, formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

function Tile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Link>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-slate-400">no prior period</span>;
  const pct = ((current - previous) / previous) * 100;
  return (
    <span className={pct >= 0 ? "text-green-700" : "text-red-600"}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs previous 30 days
    </span>
  );
}

export default async function Overview() {
  const to = new Date().toISOString().slice(0, 10);
  const from = shiftDate(to, -29);
  const filters: ReportFilters = { from, to, groupBy: "client" };
  const prev = previousPeriod(from, to);

  const [current, comparison, daily, failCodes, validity] = await Promise.all([
    getReport(filters),
    getReport({ ...filters, ...prev }),
    getDailySeriesForOverview(filters),
    getFailCodeBreakdown({ ...filters, outcomes: ["no_result", "invalid"] }),
    getValidityForPeriod(filters),
  ]);

  const t = current.totals;
  const p = comparison.totals;
  // Success = we reached a verdict, whether the offer proved valid or invalid.
  const successRate = t.runs > 0 ? (t.resolved / t.runs) * 100 : null;
  const qs = reportQueryString(filters);
  const topReasons = failCodes.slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-xs text-slate-500">
          Last 30 days · {from} → {to}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Validations"
          value={formatCount(t.runs)}
          sub={<Delta current={t.runs} previous={p.runs} />}
          href={`/reports/runs?${qs}`}
        />
        <Tile
          label="Success rate"
          value={successRate == null ? "—" : `${successRate.toFixed(0)}%`}
          sub={`${formatCount(t.resolved)} of ${formatCount(t.runs)} reached a result`}
          href={`/reports/runs?${reportQueryString({ ...filters, outcomes: ["valid", "invalid"] })}`}
        />
        <Tile
          label="LLM cost"
          value={formatCost(t.cost)}
          sub={<Delta current={t.cost} previous={p.cost} />}
          href={`/reports?${qs}`}
        />
        <Tile
          label={ratesConfigured() ? "Revenue estimate" : "Revenue estimate"}
          value={t.revenue == null ? "—" : `$${t.revenue.toFixed(2)}`}
          sub={ratesConfigured() ? "reached a result × client rate" : "set CLIENT_VALIDATION_RATES"}
          href={`/reports?${qs}`}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Validations per day</h2>
          <Link href={`/reports?${qs}&groupBy=day`} className="text-xs text-sky-700 hover:underline">
            Break down in Reports →
          </Link>
        </div>
        <StackedOutcomeChart data={daily} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Why runs could not reach a result</h2>
            <Link
              href={`/reports/runs?${reportQueryString({ ...filters, outcomes: ["no_result"] })}`}
              className="text-xs text-sky-700 hover:underline"
            >
              See them →
            </Link>
          </div>
          {topReasons.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing to report.</p>
          ) : (
            <ul className="space-y-1.5">
              {topReasons.map((r) => (
                <li key={r.code}>
                  <Link
                    href={`/reports/runs?${reportQueryString({ ...filters, outcomes: ["no_result"], failCode: r.code })}`}
                    className="flex items-center justify-between gap-3 rounded px-2 py-1 text-sm hover:bg-slate-50"
                  >
                    <span className="font-mono text-xs text-slate-600">{r.code}</span>
                    <span className="text-slate-500">{formatCount(r.runs)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Offers created</h2>
            <Link
              href="/reports?groupBy=merchant"
              className="text-xs text-sky-700 hover:underline"
            >
              By merchant →
            </Link>
          </div>
          {validity.length === 0 ? (
            <p className="text-sm text-slate-400">No offers created in this period.</p>
          ) : (
            <ValidityBar counts={validity} />
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">By customer</h2>
          <Link href={`/reports?${qs}`} className="text-xs text-sky-700 hover:underline">
            Full report →
          </Link>
        </div>
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 pr-4">Customer</th>
              <th className="py-1 pr-4">Validations</th>
              <th className="py-1 pr-4">Reached result</th>
              <th className="py-1 pr-4">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {current.rows.map((row) => (
              <tr key={row.key}>
                <td className="py-1.5 pr-4">
                  <Link
                    href={`/reports?${reportQueryString({ ...filters, clientIds: [row.key], groupBy: "month" })}`}
                    className="text-sky-700 hover:underline"
                  >
                    {row.key}
                  </Link>
                </td>
                <td className="py-1.5 pr-4">{formatCount(row.runs)}</td>
                <td className="py-1.5 pr-4 text-green-700">{formatCount(row.resolved)}</td>
                <td className="py-1.5 pr-4">{formatCost(row.cost)}</td>
              </tr>
            ))}
            {current.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No validations in the last 30 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
