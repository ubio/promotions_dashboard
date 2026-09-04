import { formatCost, formatCount } from "@/lib/format";
import type { PeriodStatsCounters } from "@/lib/stats-model";
import { StatTile } from "./StatTile";

export function CounterTiles({
  stats,
  pendingPromotionOutcomes,
}: {
  stats: PeriodStatsCounters;
  pendingPromotionOutcomes?: boolean;
}) {
  const p = stats.promotionsStats;
  const v = stats.validationsStats;
  const conclusions = v.conclusionsCount;
  const successRate = conclusions > 0 ? Math.round((v.clientFacingCount / conclusions) * 100) : null;
  return (
    <div className="grid h-full grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Received promotions"
        value={formatCount(p.receivedPromotions)}
        sub={`${formatCount(p.promotionsExportedToCsv)} exported to CSV`}
      />
      <StatTile
        label="Client-facing promotions"
        value={formatCount(p.clientFacingCount)}
        sub={`${formatCount(p.leftForDebugCount)} left for debug`}
        pending={pendingPromotionOutcomes}
      />
      <StatTile
        label="Validations"
        value={formatCount(v.totalValidationsCount)}
        sub={
          successRate == null
            ? `${formatCount(v.errorsCount)} errors`
            : `${successRate}% client-facing conclusions`
        }
      />
      <StatTile
        label="Validation cost"
        value={formatCost(v.totalValidationsCost)}
        sub={`${formatCount(v.botDetectionValidationCount)} bot detection`}
      />
    </div>
  );
}
