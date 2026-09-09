import { OTHER_FAIL_CODES } from "@/lib/fail-codes";

// Server-rendered SVG charts. Colors follow the validated reference palette:
// status good/critical for success/failed, sequential blue for magnitude.
const INK = {
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
};
const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
const WARNING = "#eda100";
const NEUTRAL = "#898781";
const BLUE = "#2a78d6";

export const CHART_COLORS = {
  good: GOOD,
  critical: CRITICAL,
  warning: WARNING,
  neutral: NEUTRAL,
  blue: BLUE,
};

const W = 720;
const H = 210;
const PAD = { top: 10, right: 8, bottom: 24, left: 40 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * mag) return m * mag;
  }
  return 10 * mag;
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

// Rounded top corners only, anchored to the baseline below.
function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} v${-(h - rr)} q0,${-rr} ${rr},${-rr} h${w - 2 * rr} q${rr},0 ${rr},${rr} v${h - rr} z`;
}

function Grid({ max, format }: { max: number; format: (v: number) => string }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <>
      {steps.map((s) => {
        const y = PAD.top + PLOT_H * (1 - s);
        return (
          <g key={s}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke={s === 0 ? INK.baseline : INK.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill={INK.muted}>
              {format(max * s)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function XTicks({ dates }: { dates: string[] }) {
  const every = Math.max(1, Math.ceil(dates.length / 8));
  const slot = PLOT_W / dates.length;
  return (
    <>
      {dates.map((d, i) =>
        i % every === 0 ? (
          <text
            key={d}
            x={PAD.left + slot * (i + 0.5)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill={INK.muted}
          >
            {shortDate(d)}
          </text>
        ) : null
      )}
    </>
  );
}

function LegendHelp({ hint }: { hint: string }) {
  return (
    <span
      className="legend-help inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] leading-none text-slate-400"
      data-hint={hint}
      tabIndex={0}
      aria-label={hint}
    >
      ?
    </span>
  );
}

function Legend({ entries }: { entries: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs" style={{ color: INK.secondary }}>
      {entries.map((e) => (
        <span key={e.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: e.color }} />
          {e.label}
        </span>
      ))}
    </div>
  );
}


interface BreakdownHoverHint {
  headline: string;
  rows: { label: string; value: number; color: string }[];
}

const hoverLayerStyle = {
  left: `${(PAD.left / W) * 100}%`,
  right: `${(PAD.right / W) * 100}%`,
  top: `${(PAD.top / H) * 100}%`,
  bottom: `${(PAD.bottom / H) * 100}%`,
};

// Invisible per-point hover targets laid over the plot area, giving exact
// numbers on hover. Percentages mirror the SVG padding so slots line up with
// the marks at any rendered width.
function HoverSlots({ hints }: { hints: string[] }) {
  return (
    <div className="chart-hints" style={hoverLayerStyle}>
      {hints.map((hint, i) => (
        <div key={i} className="chart-hint" data-hint={hint} tabIndex={0} />
      ))}
    </div>
  );
}

function BreakdownHoverSlots({ hints }: { hints: BreakdownHoverHint[] }) {
  return (
    <div className="chart-hints" style={hoverLayerStyle}>
      {hints.map((hint, i) => (
        <div key={i} className="chart-hint chart-hint-breakdown" tabIndex={0}>
          <div className="chart-hint-popup">
            <p className="chart-hint-headline">{hint.headline}</p>
            {hint.rows.map((row) => (
              <p key={row.label} className="chart-hint-row" style={{ color: row.color }}>
                {row.label}: {row.value.toLocaleString()}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackedOutcomeChart({
  data,
  showErrors = true,
}: {
  // "valid"/"invalid" are both successful runs — the pipeline reached a
  // verdict. "noResult" is the failure case: the run never got there.
  data: { date: string; valid: number; invalid: number; noResult: number }[];
  showErrors?: boolean;
}) {
  const total = (d: { valid: number; invalid: number; noResult: number }) =>
    d.valid + d.invalid + (showErrors ? d.noResult : 0);
  const max = niceMax(Math.max(...data.map(total), 1));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);
  const scale = (v: number) => (v / max) * PLOT_H;

  return (
    <div>
      <Legend
        entries={[
          { label: "Valid", color: GOOD },
          { label: "Invalid", color: CRITICAL },
          ...(showErrors ? [{ label: "No result (run could not finish)", color: WARNING }] : []),
        ]}
      />
      <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Validations per day: valid, invalid and runs with no result"
      >
        <Grid max={max} format={(v) => String(Math.round(v))} />
        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - bw) / 2;
          const baseline = PAD.top + PLOT_H;
          const segments = [
            { v: d.valid, color: GOOD },
            { v: d.invalid, color: CRITICAL },
            ...(showErrors ? [{ v: d.noResult, color: WARNING }] : []),
          ].filter((seg) => seg.v > 0);
          let y = baseline;
          return (
            <g key={d.date}>
              {segments.map((seg, j) => {
                const h = scale(seg.v);
                const isTop = j === segments.length - 1;
                const gap = j > 0 ? 2 : 0;
                y -= h + gap;
                return isTop ? (
                  <path key={j} d={roundedTopRect(x, y, bw, h, 3)} fill={seg.color} />
                ) : (
                  <rect key={j} x={x} y={y} width={bw} height={h} fill={seg.color} />
                );
              })}
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={PLOT_H} fill="transparent">
                <title>{`${shortDate(d.date)} — ${total(d)} runs: ${d.valid} valid, ${d.invalid} invalid${showErrors ? `, ${d.noResult} no result` : ""}`}</title>
              </rect>
            </g>
          );
        })}
        <XTicks dates={data.map((d) => d.date)} />
      </svg>
      <HoverSlots
        hints={data.map(
          (d) =>
            `${shortDate(d.date)}\n${total(d)} validations\nValid ${d.valid} · Invalid ${d.invalid}` +
            (showErrors ? `\nNo result ${d.noResult}` : "")
        )}
      />
      </div>
    </div>
  );
}

const VALIDATION_SPLIT_SEGMENTS = [
  {
    key: "client-facing",
    label: "Client-facing conclusions",
    color: GOOD,
    hint: "Runs that reached a verdict the client can act on — valid, invalid, or a recognised client-facing failure.",
  },
  {
    key: "automation",
    label: "Automation issues",
    color: "#eb6834",
    hint: "Runs blocked by automation or infrastructure — bot detection, timeouts, agent errors, and similar.",
  },
  {
    key: "other",
    label: "Other",
    color: NEUTRAL,
    hint: OTHER_FAIL_CODES.join(", "),
  },
] as const;

export function ValidationSplitBar({
  runs,
  clientFacing,
  automationIssues,
}: {
  runs: number;
  clientFacing: number;
  automationIssues: number;
}) {
  if (runs === 0) return <p className="text-sm text-slate-400">No validations in this period.</p>;
  const other = Math.max(0, runs - clientFacing - automationIssues);
  const values: Record<(typeof VALIDATION_SPLIT_SEGMENTS)[number]["key"], number> = {
    "client-facing": clientFacing,
    automation: automationIssues,
    other,
  };
  const segments = VALIDATION_SPLIT_SEGMENTS.map((segment) => ({
    ...segment,
    value: values[segment.key],
  }));
  const shown = segments.filter((s) => s.value > 0);
  const pct = (n: number) => `${Math.round((n / runs) * 100)}%`;
  return (
    <div>
      <ul className="mb-2 space-y-1 text-sm text-slate-700">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1">
              {segment.label}
              <LegendHelp hint={segment.hint} />
            </span>
            <span className="[font-variant-numeric:tabular-nums] text-slate-500">
              {segment.value.toLocaleString()} ({pct(segment.value)})
            </span>
          </li>
        ))}
      </ul>
      <div
        className="relative flex h-6 w-full gap-0.5 rounded"
        role="img"
        aria-label="Validation runs: client-facing conclusions, automation issues, and other"
      >
        {shown.map((s) => (
          <div
            key={s.label}
            className="chart-hint"
            style={{ width: `${(s.value / runs) * 100}%`, background: s.color, flex: "none" }}
            data-hint={`${s.label}\n${s.value.toLocaleString()} of ${runs.toLocaleString()} (${((s.value / runs) * 100).toFixed(1)}%)`}
            tabIndex={0}
          />
        ))}
      </div>
    </div>
  );
}

export function ValidityBar({
  counts,
}: {
  counts: { label: string; value: number }[];
}) {
  const COLORS: Record<string, string> = {
    valid: GOOD,
    invalid: CRITICAL,
    cannot_validate: WARNING,
    merchant_automation_issues: "#eb6834",
    insufficient_validations: NEUTRAL,
  };
  const total = counts.reduce((s, c) => s + c.value, 0);
  if (total === 0) return <p className="text-sm text-slate-400">No promotions.</p>;
  return (
    <div>
      <Legend
        entries={counts.map((c) => ({
          label: `${c.label.replaceAll("_", " ")} — ${c.value.toLocaleString()} (${Math.round((c.value / total) * 100)}%)`,
          color: COLORS[c.label] ?? NEUTRAL,
        }))}
      />
      <div className="relative flex h-6 w-full gap-0.5 rounded" role="img" aria-label="Promotions by validity status">
        {counts
          .filter((c) => c.value > 0)
          .map((c) => (
            <div
              key={c.label}
              className="chart-hint"
              style={{ width: `${(c.value / total) * 100}%`, background: COLORS[c.label] ?? NEUTRAL, flex: "none" }}
              data-hint={`${c.label.replaceAll("_", " ")}\n${c.value.toLocaleString()} of ${total.toLocaleString()} (${((c.value / total) * 100).toFixed(1)}%)`}
              tabIndex={0}
            />
          ))}
      </div>
    </div>
  );
}

export function RateLineChart({
  data,
  ariaLabel = "Conclusions rate per day",
}: {
  data: { date: string; rate: number | null }[];
  ariaLabel?: string;
}) {
  const slot = PLOT_W / data.length;
  const y = (rate: number) => PAD.top + PLOT_H * (1 - rate);
  const points = data
    .map((d, i) => (d.rate == null ? null : { x: PAD.left + slot * (i + 0.5), y: y(d.rate), d }))
    .filter((p) => p !== null);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const showDots = points.length <= 45;

  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <Grid max={1} format={(v) => `${Math.round(v * 100)}%`} />
      {path && <path d={path} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />}
      {points.map((p) => (
        <g key={p.d.date}>
          {showDots && <circle cx={p.x} cy={p.y} r={3} fill={BLUE} stroke="#ffffff" strokeWidth={2} />}
          <circle cx={p.x} cy={p.y} r={8} fill="transparent">
            <title>{`${shortDate(p.d.date)} — ${Math.round((p.d.rate ?? 0) * 100)}% conclusions`}</title>
          </circle>
        </g>
      ))}
      <XTicks dates={data.map((d) => d.date)} />
    </svg>
    <HoverSlots
      hints={data.map((d) =>
        d.rate == null
          ? `${shortDate(d.date)}\nNo validations`
          : `${shortDate(d.date)}\n${(d.rate * 100).toFixed(1)}% reached a result`
      )}
    />
    </div>
  );
}

export function CostBarChart({ data }: { data: { date: string; cost: number }[] }) {
  const max = niceMax(Math.max(...data.map((d) => d.cost), 0.01));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);

  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="LLM cost per day">
      <Grid max={max} format={(v) => `$${v < 1 ? v.toFixed(2) : Math.round(v)}`} />
      {data.map((d, i) => {
        const x = PAD.left + slot * i + (slot - bw) / 2;
        const h = (d.cost / max) * PLOT_H;
        return (
          <g key={d.date}>
            {h > 0 && <path d={roundedTopRect(x, PAD.top + PLOT_H - h, bw, h, 3)} fill={BLUE} />}
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={PLOT_H} fill="transparent">
              <title>{`${shortDate(d.date)} — $${d.cost.toFixed(2)} LLM cost`}</title>
            </rect>
          </g>
        );
      })}
      <XTicks dates={data.map((d) => d.date)} />
    </svg>
    <HoverSlots
      hints={data.map((d) => `${shortDate(d.date)}\n$${d.cost.toFixed(2)} LLM cost`)}
    />
    </div>
  );
}

export function StackedSeriesChart({
  data,
  series,
  ariaLabel,
}: {
  data: { date: string; values: number[] }[];
  series: { label: string; color: string }[];
  ariaLabel: string;
}) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No daily data in the last 30 days.</p>;
  const total = (values: number[]) => values.reduce((sum, n) => sum + n, 0);
  const max = niceMax(Math.max(...data.map((d) => total(d.values)), 1));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);
  const scale = (v: number) => (v / max) * PLOT_H;
  const hoverHints = data.map((d) => {
    const dayTotal = total(d.values);
    return {
      headline: `${shortDate(d.date)} - ${dayTotal.toLocaleString()} total`,
      rows: series.map((sr, j) => ({
        label: sr.label,
        value: d.values[j] ?? 0,
        color: sr.color,
      })),
    };
  });

  return (
    <div>
      <Legend entries={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
        <Grid max={max} format={(v) => String(Math.round(v))} />
        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - bw) / 2;
          const baseline = PAD.top + PLOT_H;
          const segments = series
            .map((s, j) => ({ v: d.values[j] ?? 0, color: s.color, label: s.label }))
            .filter((seg) => seg.v > 0);
          let y = baseline;
          return (
            <g key={d.date}>
              {segments.map((seg, j) => {
                const h = scale(seg.v);
                const isTop = j === segments.length - 1;
                const gap = j > 0 ? 2 : 0;
                y -= h + gap;
                return isTop ? (
                  <path key={seg.label} d={roundedTopRect(x, y, bw, h, 3)} fill={seg.color} />
                ) : (
                  <rect key={seg.label} x={x} y={y} width={bw} height={h} fill={seg.color} />
                );
              })}
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={PLOT_H} fill="transparent">
                <title>
                  {`${shortDate(d.date)} — ${series
                    .map((s, j) => `${s.label}: ${d.values[j] ?? 0}`)
                    .join(", ")}`}
                </title>
              </rect>
            </g>
          );
        })}
        <XTicks dates={data.map((d) => d.date)} />
      </svg>
    <BreakdownHoverSlots hints={hoverHints} />
    </div>
    </div>
  );
}

export function CountBarChart({
  data,
  ariaLabel,
  formatValue = (v) => String(Math.round(v)),
}: {
  data: { date: string; value: number }[];
  ariaLabel: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No daily data in the last 30 days.</p>;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);
  const hoverHints = data.map((d) => `${shortDate(d.date)}\n${formatValue(d.value)}`);

  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <Grid max={max} format={(v) => formatValue(v)} />
      {data.map((d, i) => {
        const x = PAD.left + slot * i + (slot - bw) / 2;
        const h = (d.value / max) * PLOT_H;
        return (
          <g key={d.date}>
            {h > 0 && <path d={roundedTopRect(x, PAD.top + PLOT_H - h, bw, h, 3)} fill={BLUE} />}
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={PLOT_H} fill="transparent">
              <title>{`${shortDate(d.date)} — ${formatValue(d.value)}`}</title>
            </rect>
          </g>
        );
      })}
      <XTicks dates={data.map((d) => d.date)} />
    </svg>
    <HoverSlots hints={hoverHints} />
    </div>
  );
}
