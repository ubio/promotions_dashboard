import { Section } from "@/components/Section";
import { CHART_COLORS, CountBarChart, StackedSeriesChart } from "@/components/charts";
import { formatCost } from "@/lib/format";
import type { DatedPeriodRow } from "@/lib/stats-queries";

export function DailyCharts({ series }: { series: DatedPeriodRow[] }) {
  return (
    <>
      <Section title="Promotions received per day">
        <CountBarChart
          data={series.map((d) => ({ date: d.date, value: d.promotionsStats.receivedPromotions }))}
          ariaLabel="Promotions received per day"
        />
      </Section>
      <Section title="Promotion outcomes per day">
        <StackedSeriesChart
          ariaLabel="Promotion outcomes per day: client-facing, debug, cannot validate, automation issues"
          series={[
            { label: "Client-facing", color: CHART_COLORS.good },
            { label: "Left for debug", color: CHART_COLORS.critical },
            { label: "Cannot validate", color: CHART_COLORS.warning },
            { label: "Automation issues", color: CHART_COLORS.neutral },
          ]}
          data={series.map((d) => ({
            date: d.date,
            values: [
              d.promotionsStats.clientFacingCount,
              d.promotionsStats.leftForDebugCount,
              d.promotionsStats.cannotValidateCount,
              d.promotionsStats.merchantAutomationIssuesCount,
            ],
          }))}
        />
      </Section>
      <Section title="Validations per day">
        <StackedSeriesChart
          ariaLabel="Validations per day: client-facing conclusions, debug conclusions, errors"
          series={[
            { label: "Client-facing conclusions", color: CHART_COLORS.good },
            { label: "Left for debug", color: CHART_COLORS.critical },
            { label: "Errors", color: CHART_COLORS.warning },
          ]}
          data={series.map((d) => ({
            date: d.date,
            values: [
              d.validationsStats.clientFacingCount,
              d.validationsStats.leftForDebugCount,
              d.validationsStats.errorsCount,
            ],
          }))}
        />
      </Section>
      <Section title="Validation cost per day">
        <CountBarChart
          data={series.map((d) => ({ date: d.date, value: d.validationsStats.totalValidationsCost }))}
          ariaLabel="Validation LLM cost per day"
          formatValue={(v) => formatCost(v) === "—" ? "$0" : formatCost(v)}
        />
      </Section>
    </>
  );
}
