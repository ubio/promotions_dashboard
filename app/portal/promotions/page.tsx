import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { requireClientSession } from "@/lib/auth";
import {
  getPortalDomains,
  getPortalPromotions,
  getPortalValidationIssueReasons,
} from "@/lib/portal";
import { formatCount, formatDate, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const RANGES = [7, 30, 60, 90] as const;

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "verified", label: "Successfully verified" },
  { value: "validation_issues", label: "Validation issues" },
] as const;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
}

export default async function PortalPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { clientId } = await requireClientSession();
  const sp = await searchParams;

  const daysRaw = Number(str(sp.days));
  const days = RANGES.includes(daysRaw as (typeof RANGES)[number]) ? daysRaw : undefined;
  const q = str(sp.q);
  const outcomeRaw = str(sp.outcome);
  const outcome = OUTCOMES.some((o) => o.value === outcomeRaw && o.value !== "")
    ? (outcomeRaw as "verified" | "validation_issues")
    : undefined;
  const finding = str(sp.finding) === "issue" ? ("issue" as const) : undefined;
  const reason = str(sp.reason);
  const issue = str(sp.issue);
  const domain = str(sp.domain);
  const page = Number(str(sp.page) ?? "1") || 1;

  const filters = {
    clientId,
    days,
    q,
    outcome,
    finding,
    reason,
    issue,
    domain,
    page,
  };

  const [result, validationIssues, domains] = await Promise.all([
    getPortalPromotions(filters),
    days ? getPortalValidationIssueReasons(clientId, days) : Promise.resolve([]),
    getPortalDomains(clientId, days),
  ]);

  const base = {
    days,
    q,
    outcome,
    finding,
    domain,
    reason: undefined as string | undefined,
    issue: undefined as string | undefined,
  };
  const params: Record<string, string | undefined> = {};
  if (days) params.days = String(days);
  if (q) params.q = q;
  if (outcome) params.outcome = outcome;
  if (finding) params.finding = finding;
  if (domain) params.domain = domain;
  if (reason) params.reason = reason;
  if (issue) params.issue = issue;

  return (
    <div data-full-width className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Your offers</h1>
          <p className="text-xs text-slate-500">
            {days
              ? `Promotions verified in the last ${days} days`
              : "All promotions sent for verification"}
          </p>
        </div>
        {days && (
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/portal/promotions?${qs({ ...base, days: r })}`}
                className={`rounded-md px-3 py-1 ${
                  days === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {r}d
              </Link>
            ))}
          </div>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
        {days && <input type="hidden" name="days" value={days} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search domain, description, code"
          className="min-w-48 max-w-full rounded border border-slate-300 px-2 py-1.5"
        />
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
          href={days ? `/portal/promotions?days=${days}` : "/portal/promotions"}
          className="ml-auto px-1 text-slate-500 hover:text-slate-700"
        >
          Reset
        </Link>
      </form>

      {validationIssues.length > 0 && !issue && days && outcome !== "verified" && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Validation issues</p>
          <div className="flex flex-wrap gap-1.5">
            {validationIssues.map((r) => (
              <Link
                key={r.code}
                href={`/portal/promotions?${qs({
                  ...base,
                  outcome: "validation_issues",
                  issue: r.code,
                })}`}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
              >
                {r.label} <span className="text-slate-400">{formatCount(r.promotions)}</span>
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
              <th className="px-3 py-2">Offer</th>
              <th className="px-3 py-2">Validity</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">What we found</th>
              <th className="px-3 py-2">Screenshot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((p) => (
              <tr key={p.id} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {p.createdAt ? formatDate(p.createdAt) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {p.sourceUrl ? (
                    <a href={p.sourceUrl} target="_blank" className="text-sky-700 hover:underline">
                      {p.domain ?? "—"}
                    </a>
                  ) : (
                    (p.domain ?? "—")
                  )}
                </td>
                <td className="min-w-48 max-w-xs px-3 py-2">
                  <Link href={`/portal/promotions/${p.id}`} className="text-sky-700 hover:underline">
                    {truncate(p.description || p.title || p.id, 80)}
                  </Link>
                  {p.code && (
                    <div className="mt-1">
                      <Badge variant="code">{p.code}</Badge>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {p.validityStatus ? (
                    <Badge variant={p.validityStatus}>{p.validityStatus}</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="min-w-48 max-w-md px-3 py-2 text-xs text-slate-600">
                  {truncate(p.reason, 120)}
                </td>
                <td className="min-w-72 px-3 py-2 text-xs text-slate-600">{p.finding}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {p.screenshot ? (
                    <a href={p.screenshot} target="_blank" className="text-sky-700 hover:underline">
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
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  No promotions match this selection.
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
        basePath="/portal/promotions"
        params={params}
      />
    </div>
  );
}
