import Link from "next/link";
import { formatUtcDay, formatUtcMonth } from "@/lib/format";
import { periodQuery, type StatsPeriod } from "@/lib/stats-model";

export function PeriodToolbar({
  basePath,
  period,
  q,
  clientIds,
  status,
  showAllPeriod,
}: {
  basePath: string;
  period: StatsPeriod;
  q?: string;
  clientIds?: string[];
  status?: string;
  showAllPeriod?: boolean;
}) {
  const dayHref = queryHref(basePath, { granularity: "day", date: period.date, q, status });
  const monthHref = queryHref(basePath, {
    granularity: "month",
    yearMonth: period.yearMonth,
    q,
    status,
  });
  const allHref = queryHref(basePath, { granularity: "all", q, status });

  const clientOptions = q && clientIds && !clientIds.includes(q) ? [q, ...clientIds] : clientIds;

  return (
    <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-3 text-sm">
      <input type="hidden" name="granularity" value={period.granularity} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">Period</span>
        <div className="flex rounded-lg border border-line bg-card p-0.5">
          <Link
            href={dayHref}
            className={`rounded-md px-3 py-1 ${
              period.granularity === "day" ? "bg-primary text-card" : "text-text hover:bg-rule"
            }`}
          >
            Day
          </Link>
          <Link
            href={monthHref}
            className={`rounded-md px-3 py-1 ${
              period.granularity === "month" ? "bg-primary text-card" : "text-text hover:bg-rule"
            }`}
          >
            Month
          </Link>
          {showAllPeriod && (
            <Link
              href={allHref}
              className={`rounded-md px-3 py-1 ${
                period.granularity === "all" ? "bg-primary text-card" : "text-text hover:bg-rule"
              }`}
            >
              All
            </Link>
          )}
        </div>
      </div>
      {period.granularity === "day" ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Date (UTC)</span>
          <input
            type="date"
            name="date"
            defaultValue={period.date}
            className="rounded border border-line px-2 py-1.5"
          />
        </label>
      ) : period.granularity === "month" ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Month</span>
          <input
            type="month"
            name="yearMonth"
            defaultValue={period.yearMonth}
            className="rounded border border-line px-2 py-1.5"
          />
        </label>
      ) : null}
      {clientIds ? (
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Client</span>
          <select
            name="q"
            defaultValue={q ?? ""}
            className="max-w-full rounded border border-line px-2 py-1.5"
          >
            <option value="">All</option>
            {clientOptions?.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        q !== undefined && (
          <label className="flex max-w-full flex-col gap-1">
            <span className="text-xs text-muted">Search</span>
            <input
              name="q"
              defaultValue={q}
              className="w-64 max-w-full rounded border border-line px-2 py-1.5"
              placeholder="domain, name or id"
            />
          </label>
        )
      )}
      {status !== undefined && (
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="max-w-full rounded border border-line px-2 py-1.5"
          >
            <option value="">All</option>
            <option value="onboarded">Onboarded</option>
            <option value="bot-detected">Bot-detected</option>
          </select>
        </label>
      )}
      <button className="rounded bg-primary px-4 py-1.5 text-card hover:bg-primary-ink">Apply</button>
      <Link href={basePath} className="py-1.5 text-muted hover:text-text">
        Reset
      </Link>
      <p className="w-full text-xs text-faint">
        {period.granularity === "day"
          ? `Daily counters are kept for the last 30 days. Showing ${formatUtcDay(period.date)}.`
          : period.granularity === "month"
            ? `Monthly totals include finalized days plus any still-open days in ${formatUtcMonth(period.yearMonth)}.`
            : "All-time totals from finalized monthly rollups plus any still-open days."}
      </p>
    </form>
  );
}

export function periodHref(basePath: string, period: StatsPeriod, extra?: Record<string, string | undefined>): string {
  return queryHref(basePath, { ...periodQuery(period), ...extra });
}

function queryHref(basePath: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `${basePath}?${q}` : basePath;
}
