import Link from "next/link";
import { HelpHint } from "@/components/HelpHint";

// Headline figure used on the Overview and on Ziff Davis billing.
export function OverviewTile({
  label,
  value,
  sub,
  href,
  newBadge,
  hint,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  href?: string;
  newBadge?: boolean;
  hint?: string;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-faint">
        {label}
        {hint && <HelpHint hint={hint} placement="below" />}
        {newBadge && (
          <span className="rounded bg-ok-bg px-1 py-px text-[10px] font-medium normal-case tracking-normal text-ok/60">
            new
          </span>
        )}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  );
  if (!href) {
    return <div className="rounded-lg border border-line bg-card px-4 py-3">{body}</div>;
  }
  return (
    <Link
      href={href}
      className="block rounded-lg border border-line bg-card px-4 py-3 transition hover:border-line hover:bg-page"
    >
      {body}
    </Link>
  );
}

export function Delta({
  current,
  previous,
  periodLabel = "previous 30 days",
}: {
  current: number;
  previous: number;
  periodLabel?: string;
}) {
  if (previous === 0) return <span className="text-faint">no prior period</span>;
  const pct = ((current - previous) / previous) * 100;
  return (
    <span className={pct >= 0 ? "text-ok" : "text-bad"}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs {periodLabel}
    </span>
  );
}
