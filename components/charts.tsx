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

export function StackedOutcomeChart({
  data,
}: {
  data: { date: string; success: number; failed: number; errors: number }[];
}) {
  const max = niceMax(Math.max(...data.map((d) => d.success + d.failed + d.errors), 1));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);
  const scale = (v: number) => (v / max) * PLOT_H;

  return (
    <div>
      <Legend
        entries={[
          { label: "Success", color: GOOD },
          { label: "Failed (concluded invalid)", color: CRITICAL },
          { label: "Error (run broke)", color: WARNING },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Validations per day: success, failed and errored runs"
      >
        <Grid max={max} format={(v) => String(Math.round(v))} />
        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - bw) / 2;
          const baseline = PAD.top + PLOT_H;
          const segments = [
            { v: d.success, color: GOOD },
            { v: d.failed, color: CRITICAL },
            { v: d.errors, color: WARNING },
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
                <title>{`${shortDate(d.date)} — ${d.success + d.failed + d.errors} runs: ${d.success} success, ${d.failed} failed, ${d.errors} errors`}</title>
              </rect>
            </g>
          );
        })}
        <XTicks dates={data.map((d) => d.date)} />
      </svg>
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
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label="Promotions by validity status">
        {counts
          .filter((c) => c.value > 0)
          .map((c) => (
            <div
              key={c.label}
              style={{ width: `${(c.value / total) * 100}%`, background: COLORS[c.label] ?? NEUTRAL }}
              title={`${c.label.replaceAll("_", " ")}: ${c.value.toLocaleString()}`}
            />
          ))}
      </div>
    </div>
  );
}

export function RateLineChart({ data }: { data: { date: string; rate: number | null }[] }) {
  const slot = PLOT_W / data.length;
  const y = (rate: number) => PAD.top + PLOT_H * (1 - rate);
  const points = data
    .map((d, i) => (d.rate == null ? null : { x: PAD.left + slot * (i + 0.5), y: y(d.rate), d }))
    .filter((p) => p !== null);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const showDots = points.length <= 45;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Validation success rate per day">
      <Grid max={1} format={(v) => `${Math.round(v * 100)}%`} />
      {path && <path d={path} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" />}
      {points.map((p) => (
        <g key={p.d.date}>
          {showDots && <circle cx={p.x} cy={p.y} r={3} fill={BLUE} stroke="#ffffff" strokeWidth={2} />}
          <circle cx={p.x} cy={p.y} r={8} fill="transparent">
            <title>{`${shortDate(p.d.date)} — ${Math.round((p.d.rate ?? 0) * 100)}% success`}</title>
          </circle>
        </g>
      ))}
      <XTicks dates={data.map((d) => d.date)} />
    </svg>
  );
}

export function CostBarChart({ data }: { data: { date: string; cost: number }[] }) {
  const max = niceMax(Math.max(...data.map((d) => d.cost), 0.01));
  const slot = PLOT_W / data.length;
  const bw = Math.max(2, slot - 2);

  return (
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
  );
}
