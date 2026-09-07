import Link from "next/link";
import Badge from "@/components/Badge";
import {
  getFailCodeBreakdown,
  getRuns,
  parseReportSearch,
  reportQueryString,
  RUNS_PAGE_SIZE,
} from "@/lib/reports";
import { formatCount, formatDate, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const OUTCOME_LABEL: Record<string, string> = {
  passed: "Passed",
  failed: "Failed",
  errored: "Errored",
};

function outcomeOf(r: { reportType?: string; success?: boolean }): "passed" | "failed" | "errored" {
  if (r.reportType === "error") return "errored";
  return r.success ? "passed" : "failed";
}

export default async function RunsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const filters = parseReportSearch(sp);
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const [{ items, total, pages, page: current }, failCodes] = await Promise.all([
    getRuns(filters, page),
    getFailCodeBreakdown(filters),
  ]);

  const qs = reportQueryString(filters);
  // Same filters minus the fail-code, for the "clear" chip and the code links.
  const baseQs = reportQueryString({ ...filters, failCode: undefined });
  const backQs = reportQueryString({
    ...filters,
    failCode: undefined,
    outcomes: undefined,
    clientIds: undefined,
    domains: undefined,
  });

  const context = [
    filters.outcomes?.length
      ? filters.outcomes.map((o) => OUTCOME_LABEL[o]).join(" + ")
      : "All outcomes",
    filters.clientIds?.length ? filters.clientIds.join(", ") : null,
    filters.domains?.length ? filters.domains.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link href={`/reports?${backQs}`} className="text-sm text-sky-700 hover:underline">
            ← Back to report
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {formatCount(total)} validation{total === 1 ? "" : "s"}
          </h1>
          <p className="text-xs text-slate-500">
            {context} · {filters.from} → {filters.to}
          </p>
        </div>
        <a
          href={`/api/reports/validations?${qs}`}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          ↓ Download these (CSV)
        </a>
      </div>

      {failCodes.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Reasons</p>
          <div className="flex flex-wrap gap-1.5">
            {filters.failCode && (
              <Link
                href={`/reports/runs?${baseQs}`}
                className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white"
              >
                {filters.failCode} ✕
              </Link>
            )}
            {!filters.failCode &&
              failCodes.map((f) => (
                <Link
                  key={f.code}
                  href={`/reports/runs?${baseQs}&failCode=${encodeURIComponent(f.code)}`}
                  className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 hover:bg-slate-200"
                >
                  {f.code} <span className="text-slate-400">{f.runs}</span>
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">What happened</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((r) => {
              const id = (r as { _id?: string })._id ?? "";
              const outcome = outcomeOf(r);
              return (
                <tr key={id} className="hover:bg-sky-50/50">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/jobs/validation/${id}`} className="text-sky-700 hover:underline">
                      {formatDate(r.createdAt)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{r.clientId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.domain ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        outcome === "passed" ? "valid" : outcome === "failed" ? "invalid" : "error"
                      }
                    >
                      {OUTCOME_LABEL[outcome].toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-36 max-w-52 flex-wrap gap-1">
                      {(r.failCodes ?? []).map((c) => (
                        <Badge key={c} variant="code">
                          {c}
                        </Badge>
                      ))}
                      {(r.failCodes ?? []).length === 0 && "—"}
                    </div>
                  </td>
                  <td className="min-w-80 max-w-lg px-3 py-2 text-xs text-slate-600">
                    {truncate(r.reasoning, 200) || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {r.screenshot ? (
                      <a href={r.screenshot} target="_blank" className="text-sky-700 hover:underline">
                        screenshot
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  No validations match this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between py-1 text-sm text-slate-600">
          <span>
            Page {current} of {pages} · {formatCount(total)} runs
          </span>
          <span className="flex gap-2">
            {current > 1 && (
              <Link
                href={`/reports/runs?${qs}&page=${current - 1}`}
                className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {current < pages && (
              <Link
                href={`/reports/runs?${qs}&page=${current + 1}`}
                className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </span>
        </div>
      )}
      {total > RUNS_PAGE_SIZE * pages && <p className="text-xs text-slate-400">Showing first results.</p>}
    </div>
  );
}
