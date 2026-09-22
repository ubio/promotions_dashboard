import Link from "next/link";
import Badge from "@/components/Badge";
import { requireClientSession } from "@/lib/auth";
import {
  getPortalDomains,
  getPortalReasons,
  getPortalRuns,
  PORTAL_REASON_CODES,
  reasonLabel,
} from "@/lib/portal";
import { formatCount, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const RANGES = [7, 30, 60, 90] as const;

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "worked", label: "Offer worked" },
  { value: "did_not_work", label: "Offer did not work" },
  { value: "incomplete", label: "Check incomplete" },
] as const;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
}

export default async function PortalValidationsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { clientId } = await requireClientSession();
  const sp = await searchParams;

  const days = RANGES.includes(Number(str(sp.days)) as (typeof RANGES)[number])
    ? Number(str(sp.days))
    : 30;
  const reason = PORTAL_REASON_CODES.includes(str(sp.reason) ?? "") ? str(sp.reason) : undefined;
  const outcomeRaw = str(sp.outcome);
  const outcome = OUTCOMES.some((o) => o.value === outcomeRaw && o.value !== "")
    ? (outcomeRaw as "worked" | "did_not_work" | "incomplete")
    : undefined;
  const domain = str(sp.domain);
  const page = Number(str(sp.page) ?? "1") || 1;

  const [result, reasons, domains] = await Promise.all([
    getPortalRuns({ clientId, days, reason, outcome, domain, page }),
    getPortalReasons(clientId, days),
    getPortalDomains(clientId, days),
  ]);

  const base = { days, outcome, domain };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Validations</h1>
          <p className="text-xs text-slate-500">
            Every check we ran on your offers in the last {days} days
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/portal/validations?${qs({ ...base, days: r, reason })}`}
              className={`rounded-md px-3 py-1 ${
                days === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
        <input type="hidden" name="days" value={days} />
        <select
          name="outcome"
          defaultValue={outcome ?? ""}
          className="rounded border border-slate-300 px-2 py-1.5"
          aria-label="Outcome"
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="reason"
          defaultValue={reason ?? ""}
          className="max-w-full rounded border border-slate-300 px-2 py-1.5"
          aria-label="Reason"
        >
          <option value="">All reasons</option>
          {reasons.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label} ({r.runs})
            </option>
          ))}
        </select>
        <select
          name="domain"
          defaultValue={domain ?? ""}
          className="max-w-full rounded border border-slate-300 px-2 py-1.5"
          aria-label="Merchant"
        >
          <option value="">All merchants</option>
          {domains.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">
          Apply
        </button>
        <Link
          href={`/portal/validations?days=${days}`}
          className="ml-auto px-1 text-slate-500 hover:text-slate-700"
        >
          Reset
        </Link>
      </form>

      {reasons.length > 0 && !reason && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
            Why offers did not work
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <Link
                key={r.code}
                href={`/portal/validations?${qs({ ...base, reason: r.code })}`}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
              >
                {r.label} <span className="text-slate-400">{r.runs}</span>
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
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">What we found</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((r) => (
              <tr key={r.id} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.sourceUrl ? (
                    <a href={r.sourceUrl} target="_blank" className="text-sky-700 hover:underline">
                      {r.domain ?? "—"}
                    </a>
                  ) : (
                    (r.domain ?? "—")
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      r.outcome === "worked"
                        ? "valid"
                        : r.outcome === "did_not_work"
                          ? "invalid"
                          : "unknown"
                    }
                  >
                    {r.outcome === "worked"
                      ? "worked"
                      : r.outcome === "did_not_work"
                        ? "did not work"
                        : "incomplete"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex min-w-40 max-w-56 flex-wrap gap-1">
                    {r.reasons.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                      >
                        {reasonLabel(c)}
                      </span>
                    ))}
                    {r.reasons.length === 0 && <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="min-w-80 max-w-lg px-3 py-2 text-xs text-slate-600">
                  {r.explanation || "—"}
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
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  No validations match this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result.pages > 1 && (
        <div className="flex items-center justify-between py-1 text-sm text-slate-600">
          <span>
            Page {result.page} of {result.pages} · {formatCount(result.total)} validations
          </span>
          <span className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/portal/validations?${qs({ ...base, reason, page: result.page - 1 })}`}
                className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {result.page < result.pages && (
              <Link
                href={`/portal/validations?${qs({ ...base, reason, page: result.page + 1 })}`}
                className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
