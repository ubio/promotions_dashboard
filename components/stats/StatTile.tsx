import { formatCost, formatCount } from "@/lib/format";
import {
  PROMOTION_OUTCOMES_PENDING_HINT,
  type PeriodStatsCounters,
} from "@/lib/stats-model";

export function StatTile({
  label,
  value,
  sub,
  pending,
}: {
  label: string;
  value: string;
  sub?: string;
  pending?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-lg border border-line px-4 py-3 ${
        pending ? "pending-promotion-outcome" : "bg-card"
      }`}
      data-hint={pending ? PROMOTION_OUTCOMES_PENDING_HINT : undefined}
      tabIndex={pending ? 0 : undefined}
    >
      <p className="text-xs uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
