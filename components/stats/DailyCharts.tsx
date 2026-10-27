import { CollapsibleGroup, CollapsibleSection } from "@/components/CollapsibleSection";
import { CHART_COLORS, CountBarChart, RateLineChart, StackedSeriesChart, type RatePoint } from "@/components/charts";
import { formatCost, formatCount } from "@/lib/format";
import type { DatedPeriodRow } from "@/lib/stats-queries";
import { PROMOTION_OUTCOMES_PENDING_HINT, isPromotionOutcomesPending } from "@/lib/stats-model";

function clientFacingShare(row: DatedPeriodRow, excludeFiltered: boolean): RatePoint {
  const received = row.promotionsStats.receivedPromotions;
  const filtered = row.promotionsStats.merchantAutomationIssuesCount;
  const clientFacing = row.promotionsStats.clientFacingCount;
  const counted = excludeFiltered ? received - filtered : received;
  if (received <= 0) return { date: row.date, rate: null };
  // Client-facing and filtered counts are written when the day is finalized.
  // An open day would otherwise plot as 0% while promotions are still in flight.
  if (isPromotionOutcomesPending(row.finalized)) {
    return { date: row.date, rate: null, detail: PROMOTION_OUTCOMES_PENDING_HINT };
  }
  if (counted <= 0) {
    return {
      date: row.date,
      rate: null,
      detail: `${formatCount(filtered)} of ${formatCount(received)} filtered on import`,
    };
  }
  const detail = excludeFiltered
    ? `${formatCount(clientFacing)} of ${formatCount(counted)} not filtered (${formatCount(filtered)} filtered)`
    : `${formatCount(clientFacing)} of ${formatCount(received)} received`;
  return { date: row.date, rate: clientFacing / counted, detail };
}

export function DailyCharts({ series }: { series: DatedPeriodRow[] }) {
  return (
    <CollapsibleGroup>
      <CollapsibleSection title="Promotions received per day">
        <CountBarChart
          data={series.map((d) => ({ date: d.date, value: d.promotionsStats.receivedPromotions }))}
          ariaLabel="Promotions received per day"
        />
      </CollapsibleSection>
      <CollapsibleSection title="Promotion outcomes per day">
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
      </CollapsibleSection>
      <CollapsibleSection title="Client-facing % of received promotions">
        <RateLineChart
          ariaLabel="Percentage of received promotions that are client-facing, per day"
          emptyLabel="No promotions received"
          rateLabel="client-facing"
          color={CHART_COLORS.good}
          data={series.map((row) => clientFacingShare(row, false))}
        />
      </CollapsibleSection>
      <CollapsibleSection title="Client-facing % excluding filtered">
        <RateLineChart
          ariaLabel="Percentage of received promotions that were not filtered on import and are client-facing, per day"
          emptyLabel="No promotions received"
          rateLabel="client-facing"
          color={CHART_COLORS.blue}
          data={series.map((row) => clientFacingShare(row, true))}
        />
      </CollapsibleSection>
      <CollapsibleSection title="Validations per day">
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
      </CollapsibleSection>
      <CollapsibleSection title="Validation cost per day">
        <CountBarChart
          data={series.map((d) => ({ date: d.date, value: d.validationsStats.totalValidationsCost }))}
          ariaLabel="Validation LLM cost per day"
          formatValue={(v) => formatCost(v) === "—" ? "$0" : formatCost(v)}
        />
      </CollapsibleSection>
    </CollapsibleGroup>
  );
}
