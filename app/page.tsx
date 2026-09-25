import Link from "next/link";
import { StackedSeriesChart, VALIDATION_OUTCOME_SERIES, ValidationSplitBar } from "@/components/charts";
import { redirectIfPortalUser, requireInternalSession } from "@/lib/auth";
import { TableHeaderLabel } from "@/components/HelpHint";
import { REPORT_COLUMN_HINTS } from "@/lib/report-column-hints";
import {
  getReport,
  getDailySeriesForOverview,
  getFailCodeBreakdown,
  getUniqueValidationStats,
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
  newBadge,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  href: string;
  newBadge?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-card px-4 py-3 transition hover:border-line hover:bg-page"
    >
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-faint">
        {label}
        {newBadge && (
          <span className="rounded bg-ok-bg px-1 py-px text-[10px] font-medium normal-case tracking-normal text-ok/60">
            new
          </span>
        )}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Link>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-faint">no prior period</span>;
  const pct = ((current - previous) / previous) * 100;
  return (
    <span className={pct >= 0 ? "text-ok" : "text-bad"}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs previous 30 days
    </span>
  );
}

export default async function Overview() {
  await redirectIfPortalUser();
  await requireInternalSession();

  const to = new Date().toISOString().slice(0, 10);
  const from = shiftDate(to, -29);
  const filters: ReportFilters = { from, to, groupBy: "client" };
  const prev = previousPeriod(from, to);

  const [current, comparison, daily, failCodes, uniqueValidations, prevUniqueValidations] =
    await Promise.all([
      getReport(filters),
      getReport({ ...filters, ...prev }),
      getDailySeriesForOverview(filters),
      getFailCodeBreakdown({ ...filters, outcomes: ["no_result"] }),
      getUniqueValidationStats(filters),
      getUniqueValidationStats({ ...filters, ...prev }),
    ]);

  const t = current.totals;
  const p = comparison.totals;
  // Success = we reached a verdict, whether the promotion proved valid or invalid.
  const successRate = t.runs > 0 ? (t.resolved / t.runs) * 100 : null;
  const uniqueReachedPct = uniqueValidations.reachedPct;
  const qs = reportQueryString(filters);
  const topReasons = failCodes.slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-xs text-muted">
          Last 30 days · {from} → {to}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Records received"
          value={formatCount(t.imported)}
          sub={<Delta current={t.imported} previous={p.imported} />}
          href={`/reports?${qs}`}
        />
        <Tile
          label="Promotions sent to client"
          value={formatCount(t.sentBack)}
          sub={<Delta current={t.sentBack} previous={p.sentBack} />}
          href={`/reports?${qs}`}
        />
        <Tile
          label="LLM cost"
          value={formatCost(t.cost)}
          sub={<Delta current={t.cost} previous={p.cost} />}
          href={`/reports?${qs}`}
        />
        <Tile
          label="Revenue estimate"
          value={t.revenue == null ? "—" : `$${t.revenue.toFixed(2)}`}
          sub={ratesConfigured() ? "promotions sent × client rate" : "set CLIENT_VALIDATION_RATES"}
          href={`/reports?${qs}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Validation runs"
          value={formatCount(t.runs)}
          sub={<Delta current={t.runs} previous={p.runs} />}
          href={`/validations/runs?${qs}`}
        />
        <Tile
          label="Validation Results Reached"
          value={successRate == null ? "—" : `${successRate.toFixed(0)}%`}
          sub={`${formatCount(t.resolved)} of ${formatCount(t.runs)} runs reached a result`}
          href={`/validations/runs?${qs}`}
        />
        <Tile
          label="Unique validations"
          value={formatCount(uniqueValidations.uniqueValidations)}
          sub={
            <Delta
              current={uniqueValidations.uniqueValidations}
              previous={prevUniqueValidations.uniqueValidations}
            />
          }
          href={`/validations/runs?${qs}`}
          newBadge
        />
        <Tile
          label="Unique results reached"
          value={uniqueReachedPct == null ? "—" : `${uniqueReachedPct.toFixed(0)}%`}
          sub={`${formatCount(uniqueValidations.uniqueResolved)} of ${formatCount(uniqueValidations.uniqueValidations)} promotions reached a result`}
          href={`/validations/runs?${qs}`}
          newBadge
        />
      </div>

      <section className="rounded-lg border border-line bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Validations per day</h2>
          <Link href={`/reports?${qs}&groupBy=day`} className="text-xs text-primary-ink hover:underline">
            Break down in Reports →
          </Link>
        </div>
        <StackedSeriesChart
          ariaLabel="Validations per day: client-facing conclusions, automation issues, other"
          series={[...VALIDATION_OUTCOME_SERIES]}
          data={daily.map((d) => ({
            date: d.date,
            values: [d.clientFacing, d.automationIssues, d.other],
          }))}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-text">Why runs could not reach a result</h2>
            <Link
              href={`/validations/runs?${reportQueryString({ ...filters, outcomes: ["no_result"] })}`}
              className="text-xs text-primary-ink hover:underline"
            >
              See them →
            </Link>
          </div>
          {topReasons.length === 0 ? (
            <p className="text-sm text-faint">Nothing to report.</p>
          ) : (
            <ul className="space-y-1.5">
              {topReasons.map((r) => (
                <li key={r.code}>
                  <Link
                    href={`/validations/runs?${reportQueryString({ ...filters, outcomes: ["no_result"], failCode: r.code })}`}
                    className="flex items-center justify-between gap-3 rounded px-2 py-1 text-sm hover:bg-page"
                  >
                    <span className="font-mono text-xs text-text">{r.code}</span>
                    <span className="text-muted">{formatCount(r.runs)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-line bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-text">
              Validation runs — {formatCount(t.runs)}
            </h2>
            <Link href={`/reports?${qs}`} className="text-xs text-primary-ink hover:underline">
              Full report →
            </Link>
          </div>
          <ValidationSplitBar
            runs={t.runs}
            clientFacing={t.clientFacing}
            automationIssues={t.automationIssues}
          />
        </section>
      </div>

      <section className="rounded-lg border border-line bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">By customer</h2>
          <Link href={`/reports?${qs}`} className="text-xs text-primary-ink hover:underline">
            Full report →
          </Link>
        </div>
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="text-left text-xs uppercase text-muted">
            <tr>
              <th className="py-1 pr-4">Customer</th>
              <th className="py-1 pr-4">
                <TableHeaderLabel label="Validations" hint={REPORT_COLUMN_HINTS.validations} />
              </th>
              <th className="py-1 pr-4">
                <TableHeaderLabel label="Reached result" hint={REPORT_COLUMN_HINTS.reachedResult} />
              </th>
              <th className="py-1 pr-4">
                <TableHeaderLabel
                  label="Promotions sent to client"
                  hint={REPORT_COLUMN_HINTS.promotionsSentToClient}
                />
              </th>
              <th className="py-1 pr-4">
                <TableHeaderLabel label="LLM Cost" hint={REPORT_COLUMN_HINTS.llmCost} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {current.rows.map((row) => (
              <tr key={row.key}>
                <td className="py-1.5 pr-4">
                  <Link
                    href={`/reports?${reportQueryString({ ...filters, clientIds: [row.key], groupBy: "month" })}`}
                    className="text-primary-ink hover:underline"
                  >
                    {row.key}
                  </Link>
                </td>
                <td className="py-1.5 pr-4">{formatCount(row.runs)}</td>
                <td className="py-1.5 pr-4 text-ok">{formatCount(row.resolved)}</td>
                <td className="py-1.5 pr-4">{formatCount(row.sentBack)}</td>
                <td className="py-1.5 pr-4">{formatCost(row.cost)}</td>
              </tr>
            ))}
            {current.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-faint">
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
