import Link from "next/link";
import { Section } from "@/components/Section";
import { StackedOutcomeChart, RateLineChart, CostBarChart } from "@/components/charts";
import { getDailyStats } from "@/lib/queries";
import { formatCost } from "@/lib/format";

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

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days) as (typeof RANGES)[number])
    ? Number(sp.days)
    : 30;

  const daily = await getDailyStats(days);

  const totals = daily.reduce(
    (acc, d) => ({
      success: acc.success + d.success,
      failed: acc.failed + d.failed,
      cost: acc.cost + d.validationCost + d.extractionCost,
      promotionsFound: acc.promotionsFound + d.promotionsFound,
    }),
    { success: 0, failed: 0, cost: 0, promotionsFound: 0 }
  );
  const totalValidations = totals.success + totals.failed;
  const successRate = totalValidations > 0 ? totals.success / totalValidations : null;

  const rateSeries = daily.map((d) => ({
    date: d.date,
    rate: d.success + d.failed > 0 ? d.success / (d.success + d.failed) : null,
  }));
  const costSeries = daily.map((d) => ({
    date: d.date,
    cost: d.validationCost + d.extractionCost,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">Stats</h1>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/stats?days=${r}`}
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
        <StatTile label="Validations" value={totalValidations.toLocaleString()} sub={`last ${days} days`} />
        <StatTile
          label="Success rate"
          value={successRate == null ? "—" : `${Math.round(successRate * 100)}%`}
          sub={`${totals.success.toLocaleString()} succeeded`}
        />
        <StatTile label="LLM cost" value={formatCost(totals.cost)} sub="validation + extraction" />
        <StatTile
          label="Promotions extracted"
          value={totals.promotionsFound.toLocaleString()}
          sub={`${daily.reduce((s, d) => s + d.extractions, 0)} extraction jobs`}
        />
      </div>

      <Section title="Validations per day">
        <StackedOutcomeChart data={daily} />
      </Section>

      <Section title="Success rate per day">
        <RateLineChart data={rateSeries} />
      </Section>

      <Section title="LLM cost per day">
        <CostBarChart data={costSeries} />
      </Section>

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Daily data table
        </summary>
        <div className="overflow-x-auto border-t border-slate-200 p-4">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-4">Date</th>
                <th className="py-1 pr-4">Success</th>
                <th className="py-1 pr-4">Failed</th>
                <th className="py-1 pr-4">Rate</th>
                <th className="py-1 pr-4">Extractions</th>
                <th className="py-1 pr-4">Promotions found</th>
                <th className="py-1 pr-4">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daily.map((d) => {
                const total = d.success + d.failed;
                return (
                  <tr key={d.date}>
                    <td className="py-1 pr-4">{d.date}</td>
                    <td className="py-1 pr-4">{d.success}</td>
                    <td className="py-1 pr-4">{d.failed}</td>
                    <td className="py-1 pr-4">{total > 0 ? `${Math.round((d.success / total) * 100)}%` : "—"}</td>
                    <td className="py-1 pr-4">{d.extractions}</td>
                    <td className="py-1 pr-4">{d.promotionsFound}</td>
                    <td className="py-1 pr-4">{formatCost(d.validationCost + d.extractionCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
