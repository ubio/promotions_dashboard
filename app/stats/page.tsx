import Link from "next/link";
import { CollapsibleGroup, CollapsibleSection } from "@/components/CollapsibleSection";
import { CHART_COLORS, CostBarChart, RateLineChart, StackedSeriesChart, ValidityBar } from "@/components/charts";
import {
  counterGroupThClass,
  counterThClass,
  counterValidationsDividerClass,
} from "@/components/stats/CountersTable";
import { formatCost, formatCount, normalizeValidity, VALIDITY_STATUSES } from "@/lib/format";
import { getDailyStats, getValidityBreakdown, type DailyStat } from "@/lib/queries";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 60, 90] as const;

function pipelineDays(value: string | undefined): number {
  const n = Number(value);
  for (const range of RANGES) {
    if (range === n) return range;
  }
  return 30;
}

function validationsCount(d: DailyStat): number {
  return d.success + d.failed + d.errors;
}

function conclusionsCount(d: DailyStat): number {
  return d.success + d.failed;
}

function conclusionsRate(d: DailyStat): number | null {
  const total = validationsCount(d);
  return total > 0 ? conclusionsCount(d) / total : null;
}

function formatRate(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

function PipelineTableHead() {
  return (
    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
      <tr>
        <th rowSpan={2} className={counterThClass}>
          Date
        </th>
        <th colSpan={4} className={`${counterGroupThClass} ${counterValidationsDividerClass}`}>
          Validations
        </th>
        <th colSpan={2} className={`${counterGroupThClass} ${counterValidationsDividerClass}`}>
          Extractions
        </th>
        <th rowSpan={2} className={`${counterThClass} ${counterValidationsDividerClass}`}>
          Cost
        </th>
      </tr>
      <tr>
        <th className={`${counterThClass} ${counterValidationsDividerClass}`}>Count</th>
        <th className={counterThClass}>Conclusions</th>
        <th className={counterThClass}>Errors</th>
        <th className={counterThClass}>Conclusions rate</th>
        <th className={`${counterThClass} ${counterValidationsDividerClass}`}>Extractions</th>
        <th className={counterThClass}>Promotions found</th>
      </tr>
    </thead>
  );
}

function PipelineMetricCells({
  validations,
  conclusions,
  errors,
  rate,
  extractions,
  promotionsFound,
  cost,
}: {
  validations: number;
  conclusions: number;
  errors: number;
  rate: number | null;
  extractions: number;
  promotionsFound: number;
  cost: number;
}) {
  return (
    <>
      <td className={`px-3 py-2 ${counterValidationsDividerClass}`}>{formatCount(validations)}</td>
      <td className="px-3 py-2">{formatCount(conclusions)}</td>
      <td className="px-3 py-2">{formatCount(errors)}</td>
      <td className="px-3 py-2">{formatRate(rate)}</td>
      <td className={`px-3 py-2 ${counterValidationsDividerClass}`}>{formatCount(extractions)}</td>
      <td className="px-3 py-2">{formatCount(promotionsFound)}</td>
      <td className={`whitespace-nowrap px-3 py-2 ${counterValidationsDividerClass}`}>{formatCost(cost)}</td>
    </>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = pipelineDays(sp.days);

  const [daily, validityRaw] = await Promise.all([getDailyStats(days), getValidityBreakdown()]);

  const validityCounts = VALIDITY_STATUSES.map((label) => ({
    label,
    value: [...validityRaw.entries()]
      .filter(([k]) => normalizeValidity(k) === label)
      .reduce((s, [, n]) => s + n, 0),
  }));

  const totals = daily.reduce(
    (acc, d) => ({
      validations: acc.validations + validationsCount(d),
      conclusions: acc.conclusions + conclusionsCount(d),
      errors: acc.errors + d.errors,
      extractions: acc.extractions + d.extractions,
      promotionsFound: acc.promotionsFound + d.promotionsFound,
      cost: acc.cost + d.validationCost + d.extractionCost,
    }),
    { validations: 0, conclusions: 0, errors: 0, extractions: 0, promotionsFound: 0, cost: 0 }
  );
  const totalConclusionsRate = totals.validations > 0 ? totals.conclusions / totals.validations : null;

  const rateSeries = daily.map((d) => ({
    date: d.date,
    rate: conclusionsRate(d),
  }));
  const costSeries = daily.map((d) => ({
    date: d.date,
    cost: d.validationCost + d.extractionCost,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">Pipeline</h1>
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
      <p className="text-sm text-slate-500">
        Aggregated from validation and extraction job logs. A successful validation is one that reached
        a conclusion. Client and merchant counters from the stats collection are under Clients and
        Merchants.
      </p>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Pipeline summary</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <PipelineTableHead />
            <tbody>
              <tr>
                <td className="whitespace-nowrap px-3 py-2">Last {days} days</td>
                <PipelineMetricCells
                  validations={totals.validations}
                  conclusions={totals.conclusions}
                  errors={totals.errors}
                  rate={totalConclusionsRate}
                  extractions={totals.extractions}
                  promotionsFound={totals.promotionsFound}
                  cost={totals.cost}
                />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <CollapsibleGroup>
        <CollapsibleSection title="Validations per day">
          <StackedSeriesChart
            ariaLabel="Validations per day: conclusions and errors"
            series={[
              { label: "Conclusions", color: CHART_COLORS.good },
              { label: "Errors", color: CHART_COLORS.warning },
            ]}
            data={daily.map((d) => ({
              date: d.date,
              values: [conclusionsCount(d), d.errors],
            }))}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Promotions by validity status (all time)">
          <ValidityBar counts={validityCounts} />
        </CollapsibleSection>

        <CollapsibleSection title="Conclusions rate per day">
          <RateLineChart data={rateSeries} />
        </CollapsibleSection>

        <CollapsibleSection title="LLM cost per day">
          <CostBarChart data={costSeries} />
        </CollapsibleSection>
      </CollapsibleGroup>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Daily data table</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <PipelineTableHead />
            <tbody className="divide-y divide-slate-100">
              {daily.map((d) => (
                <tr key={d.date}>
                  <td className="whitespace-nowrap px-3 py-2">{d.date}</td>
                  <PipelineMetricCells
                    validations={validationsCount(d)}
                    conclusions={conclusionsCount(d)}
                    errors={d.errors}
                    rate={conclusionsRate(d)}
                    extractions={d.extractions}
                    promotionsFound={d.promotionsFound}
                    cost={d.validationCost + d.extractionCost}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
