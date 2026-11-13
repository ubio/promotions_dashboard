// Ziff Davis billing: the Overview's figures, always filtered to Ziff Davis,
// over a chosen period and broken down by month and day for invoicing.
// Internal only — Ziff Davis's own client view is the offers portal.
import Link from "next/link";
import GoogleBillingFilterBar from "@/components/google/GoogleBillingFilterBar";
import { TableHeaderLabel } from "@/components/HelpHint";
import { OverviewTile as Tile } from "@/components/OverviewTile";
import { requireInternalSession } from "@/lib/auth";
import { formatUsd } from "@/lib/billing-currency";
import { ZIFF_DAVIS_BILLING_PATH, ZIFF_DAVIS_CLIENT_ID } from "@/lib/client-portal-path";
import { formatCost, formatCount, formatUtcDay, formatUtcMonth } from "@/lib/format";
import { matchPreset } from "@/components/reports/PeriodPresets";
import { rateFor } from "@/lib/rates";
import { OVERVIEW_HINTS, REPORT_COLUMN_HINTS } from "@/lib/report-column-hints";
import {
  FIRST_REPORT_DATE,
  getReport,
  reportQueryString,
  type ReportFilters,
  type ReportRow,
  type ReportTotals,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

const HINTS = {
  amount:
    "Promotions exported to Ziff Davis multiplied by their rate. What to invoice for the period, before any contract minimums or tiers.",
} as const;

function isIsoDate(value: string | string[] | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// No range means all time, from the first validation run to today.
function parsePeriod(search: Search): { from: string; to: string; narrowed: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  if (isIsoDate(search.from) && isIsoDate(search.to)) {
    const [from, to] = search.from <= search.to ? [search.from, search.to] : [search.to, search.from];
    return { from, to, narrowed: true };
  }
  return { from: FIRST_REPORT_DATE, to: today, narrowed: false };
}

function describePeriod(from: string, to: string, narrowed: boolean): string {
  const range = `${from} → ${to}`;
  if (!narrowed) return `All time · ${range}`;
  const preset = matchPreset(from, to);
  return preset ? `${preset.label} · ${range}` : range;
}

function money(amount: number | null): string {
  return amount == null ? "—" : formatUsd(amount);
}

// Ziff Davis has one rate, so the amount is exact: sent × rate, $0 when nothing was sent.
function amount(row: ReportTotals, rate: number | null): number | null {
  return rate == null ? null : row.sentBack * rate;
}

function share(count: number, of: number, noun: string): string {
  if (of <= 0) return `no ${noun}`;
  return `${((count / of) * 100).toFixed(1)}% of ${noun}`;
}

const COLUMNS = [
  { label: "Records received", hint: OVERVIEW_HINTS.recordsReceived },
  { label: "Validations", hint: REPORT_COLUMN_HINTS.validations },
  { label: "Reached result", hint: REPORT_COLUMN_HINTS.reachedResult },
  { label: "Exported to client", hint: REPORT_COLUMN_HINTS.promotionsSentToClient },
  { label: "LLM cost", hint: REPORT_COLUMN_HINTS.llmCost },
  { label: "Amount to bill", hint: HINTS.amount },
];

function cells(row: ReportTotals, rate: number | null): string[] {
  return [
    formatCount(row.imported),
    formatCount(row.runs),
    formatCount(row.resolved),
    formatCount(row.sentBack),
    formatCost(row.cost),
    money(amount(row, rate)),
  ];
}

function BillingTable({
  title,
  keyLabel,
  rows,
  totals,
  formatKey,
  linkFor,
  rate,
}: {
  title: string;
  keyLabel: string;
  rows: ReportRow[];
  totals: ReportTotals;
  formatKey: (key: string) => string;
  linkFor: (key: string) => string;
  rate: number | null;
}) {
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-text">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="text-left text-xs uppercase text-muted">
            <tr>
              <th className="py-1 pr-4">{keyLabel}</th>
              {COLUMNS.map((column) => (
                <th key={column.label} className="py-1 pr-4">
                  <TableHeaderLabel label={column.label} hint={column.hint} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="whitespace-nowrap py-1.5 pr-4">
                  <Link href={linkFor(row.key)} className="text-primary-ink hover:underline">
                    {formatKey(row.key)}
                  </Link>
                </td>
                {cells(row, rate).map((value, index) => (
                  <td key={COLUMNS[index].label} className="whitespace-nowrap py-1.5 pr-4">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-6 text-center text-faint">
                  No Ziff Davis activity in this period.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-line font-semibold text-ink">
              <tr>
                <td className="py-2 pr-4">Total</td>
                {cells(totals, rate).map((value, index) => (
                  <td key={COLUMNS[index].label} className="whitespace-nowrap py-2 pr-4">
                    {value}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

export default async function ZiffDavisBillingPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireInternalSession();
  const search = await searchParams;
  const { from, to, narrowed } = parsePeriod(search);
  const filters: ReportFilters = { from, to, clientIds: [ZIFF_DAVIS_CLIENT_ID] };

  const [current, byMonth, byDay] = await Promise.all([
    getReport({ ...filters, groupBy: "client" }),
    getReport({ ...filters, groupBy: "month" }),
    getReport({ ...filters, groupBy: "day" }),
  ]);

  const t = current.totals;
  const rate = rateFor(ZIFF_DAVIS_CLIENT_ID);
  const billed = amount(t, rate);
  const qs = reportQueryString(filters);
  const newestFirst = (rows: ReportRow[]) => [...rows].sort((a, b) => b.key.localeCompare(a.key));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Ziff Davis billing</h1>
        <p className="text-xs text-muted">{describePeriod(from, to, narrowed)}</p>
      </div>

      <GoogleBillingFilterBar
        action={ZIFF_DAVIS_BILLING_PATH}
        from={narrowed ? from : ""}
        to={narrowed ? to : ""}
      />

      {/* Same rule as Google billing: the funnel in one row, each step as a
          share of the one before it, then the money. */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Tile
            label="Records received"
            hint={OVERVIEW_HINTS.recordsReceived}
            value={formatCount(t.imported)}
            sub="promotions in Ziff Davis import files"
            href={`/reports?${qs}`}
          />
          <Tile
            label="Validation runs"
            hint={OVERVIEW_HINTS.validationRuns}
            value={formatCount(t.runs)}
            sub={`${formatCount(t.resolved)} reached a result · ${share(t.resolved, t.runs, "runs")}`}
            href={`/validations/runs?${qs}`}
          />
          <Tile
            label="Exported to client"
            hint={OVERVIEW_HINTS.promotionsSentToClient}
            value={formatCount(t.sentBack)}
            sub={share(t.sentBack, t.imported, "records received")}
            href={`/reports?${qs}`}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Tile
            label="LLM cost"
            hint={OVERVIEW_HINTS.llmCost}
            value={formatCost(t.cost)}
            sub="USD"
            href={`/reports?${qs}`}
          />
          <Tile
            label="Amount to bill"
            hint={HINTS.amount}
            value={money(billed)}
            sub={billed == null ? "set CLIENT_VALIDATION_RATES" : "USD"}
          />
        </div>
      </div>

      <BillingTable
        title="By month"
        keyLabel="Month"
        rows={newestFirst(byMonth.rows)}
        totals={byMonth.totals}
        formatKey={formatUtcMonth}
        rate={rate}
        linkFor={(key) => {
          const monthFrom = `${key}-01`;
          const end = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0))
            .toISOString()
            .slice(0, 10);
          return `${ZIFF_DAVIS_BILLING_PATH}?from=${monthFrom}&to=${end}`;
        }}
      />

      <BillingTable
        title="By day"
        keyLabel="Day"
        rows={newestFirst(byDay.rows)}
        totals={byDay.totals}
        formatKey={formatUtcDay}
        rate={rate}
        linkFor={(key) => `/reports?${reportQueryString({ ...filters, from: key, to: key, groupBy: "merchant" })}`}
      />

      <p className="text-xs text-faint">
        Amount to bill is promotions exported to Ziff Davis × the configured rate
        {rate == null ? "" : ` of ${formatUsd(rate)} per promotion`}, in USD. It ignores contract
        minimums and tiers. LLM cost is the validation spend for Ziff
        Davis runs in the same period. Days are UTC.
      </p>
    </div>
  );
}
