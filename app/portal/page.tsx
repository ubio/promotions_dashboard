import Link from "next/link";
import { Section } from "@/components/Section";
import { StackedOutcomeChart, ValidityBar } from "@/components/charts";
import { requireClientSession } from "@/lib/auth";
import { getDailyStats, getValidityBreakdown } from "@/lib/queries";
import { normalizeValidity, VALIDITY_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 60, 90] as const;

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { clientId } = await requireClientSession();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days) as (typeof RANGES)[number]) ? Number(sp.days) : 30;

  const [daily, validityRaw] = await Promise.all([
    getDailyStats(days, clientId),
    getValidityBreakdown(clientId),
  ]);

  const validityCounts = VALIDITY_STATUSES.map((label) => ({
    label,
    value: [...validityRaw.entries()]
      .filter(([k]) => normalizeValidity(k) === label)
      .reduce((s, [, n]) => s + n, 0),
  }));
  const totalPromotions = validityCounts.reduce((s, c) => s + c.value, 0);
  const validCount = validityCounts.find((c) => c.label === "valid")?.value ?? 0;

  const totals = daily.reduce(
    (acc, d) => ({ success: acc.success + d.success, failed: acc.failed + d.failed }),
    { success: 0, failed: 0 }
  );
  const completed = totals.success + totals.failed;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">Overview</h1>
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Promotions" value={totalPromotions.toLocaleString()} sub="all time" />
        <StatTile
          label="Currently valid"
          value={validCount.toLocaleString()}
          sub={totalPromotions > 0 ? `${Math.round((validCount / totalPromotions) * 100)}% of promotions` : undefined}
        />
        <StatTile label="Validations" value={completed.toLocaleString()} sub={`last ${days} days`} />
        <StatTile
          label="Success rate"
          value={completed > 0 ? `${Math.round((totals.success / completed) * 100)}%` : "—"}
          sub={`${totals.success.toLocaleString()} succeeded`}
        />
      </div>

      <Section title="Validations per day">
        <StackedOutcomeChart data={daily} showErrors={false} />
      </Section>

      <Section title="Promotions by validity status (all time)">
        <ValidityBar counts={validityCounts} />
      </Section>
    </div>
  );
}
