import Link from "next/link";
import { requireClientSession } from "@/lib/auth";
import { getPortalSummary, getPortalValidationIssueReasons } from "@/lib/portal";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 60, 90] as const;

function Tile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </>
  );
  const className =
    "rounded-lg border border-slate-200 bg-white px-4 py-3" +
    (href ? " transition hover:border-slate-300 hover:bg-slate-50" : "");
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default async function PortalOverview({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { clientId } = await requireClientSession();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days) as (typeof RANGES)[number])
    ? Number(sp.days)
    : 30;

  const [summary, validationIssues] = await Promise.all([
    getPortalSummary(clientId, days),
    getPortalValidationIssueReasons(clientId, days),
  ]);

  const link = (extra: string) => `/portal/promotions?days=${days}${extra}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Your promotions</h1>
          <p className="text-xs text-slate-500">Verification results for the last {days} days</p>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/portal?days=${r}`}
              className={`rounded-md px-3 py-1 ${
                days === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile
          label="Offers checked"
          value={formatCount(summary.checked)}
          sub={`last ${days} days`}
          href={link("")}
        />
        <Tile
          label="Successfully verified"
          value={formatCount(summary.verified)}
          sub="with evidence we can share"
          href={link("&outcome=verified")}
        />
        <Tile
          label="Validation issues"
          value={formatCount(summary.validationIssues)}
          sub="could not complete verification"
          href={link("&outcome=validation_issues")}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Validation issues</h2>
          <Link
            href={link("&outcome=validation_issues")}
            className="text-xs text-sky-700 hover:underline"
          >
            See all →
          </Link>
        </div>
        {validationIssues.length === 0 ? (
          <p className="text-sm text-slate-400">No validation issues in this period.</p>
        ) : (
          <ul className="space-y-1">
            {validationIssues.map((r) => (
              <li key={r.code}>
                <Link
                  href={link(
                    `&outcome=validation_issues&issue=${encodeURIComponent(r.code)}`
                  )}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-700">{r.label}</span>
                  <span className="text-slate-500">{formatCount(r.promotions)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Every offer is checked against the live merchant site. &ldquo;Successfully verified&rdquo;
        means we finished the check and have evidence to share with you. &ldquo;Validation
        issues&rdquo; means we could not finish the check; those offers are retried on our side.
      </p>
    </div>
  );
}
