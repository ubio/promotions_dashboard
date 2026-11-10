import GoogleBillingFilterBar from "@/components/google/GoogleBillingFilterBar";
import GoogleBillingGroupTable from "@/components/google/GoogleBillingGroupTable";
import { requireGoogleBillingSession } from "@/lib/auth";
import { HelpHint, TableHeaderLabel } from "@/components/HelpHint";
import { formatCount, formatUtcDay } from "@/lib/format";
import {
  GBP_PER_EXPORTED_PROMOTION,
  GBP_TO_USD,
  GOOGLE_CONTRACT_BUDGET_GBP,
  budgetUsedPercent,
  describeGoogleBillingPeriod,
  exportCostGbp,
  formatBudgetPercent,
  formatBudgetSpent,
  formatGbp,
  formatGbpIn,
  formatGigabytes,
  formatSharePercent,
  formatUsd,
  formatUsdIn,
  googleBillingHints,
  parseBillingCurrency,
  qualifiedSharePercent,
  type BillingCurrency,
  type GoogleBillingHints,
  getGoogleBilling,
  getGoogleBillingCountries,
  googleBillingHasNarrowing,
  googleCountryLabel,
  parseGoogleBillingSearch,
  type GoogleBillingTotals,
} from "@/lib/google-billing";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function billingCells(
  row: GoogleBillingTotals,
  showInternalCosts: boolean,
  currency: BillingCurrency
): string[] {
  const cells = [
    formatCount(row.sourcesImported),
    formatCount(row.promotionsExtracted),
    formatCount(row.promotionsQualified),
  ];
  if (showInternalCosts) cells.push(formatCount(row.promotionsValidated), formatGigabytes(row.proxyBytes));
  cells.push(formatCount(row.promotionsSent));
  if (showInternalCosts) cells.push(formatUsdIn(row.llmCostUsd, currency), formatBudgetSpent(row.promotionsSent, currency));
  return cells;
}

function groupHeaders(
  leading: { label: string; hint: string }[],
  showInternalCosts: boolean,
  hints: GoogleBillingHints
): { label: string; hint: string }[] {
  const headers: { label: string; hint: string }[] = [
    ...leading,
    { label: "Sources", hint: hints.sources },
    { label: "Extracted", hint: hints.extracted },
    { label: "Qualified", hint: hints.qualified },
  ];
  if (showInternalCosts) {
    headers.push(
      { label: "Validated", hint: hints.validated },
      { label: "Proxy", hint: hints.proxy },
    );
  }
  headers.push({ label: "Valid - Sent", hint: hints.sent });
  if (showInternalCosts) {
    headers.push(
      { label: "LLM cost", hint: hints.llmCost },
      { label: "Budget spent", hint: hints.budgetSpent },
    );
  }
  return headers;
}

function bundleLabel(bundleId: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(bundleId) ? formatUtcDay(bundleId) : bundleId;
}

function shareOfExtracted(qualified: number, extracted: number): string {
  const share = qualifiedSharePercent(qualified, extracted);
  if (share == null) return "no promotions extracted";
  return `${formatSharePercent(share)} of extracted`;
}

function shareOfQualified(count: number, qualified: number): string {
  const share = qualifiedSharePercent(count, qualified);
  if (share == null) return "no qualified promotions";
  return `${formatSharePercent(share)} of qualified`;
}

function Tile({
  label,
  value,
  sub,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-faint">
        {label}
        {hint && <HelpHint hint={hint} placement="below" />}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function BudgetSlider({
  promotionsSent,
  currency,
  hint,
}: {
  promotionsSent: number;
  currency: BillingCurrency;
  hint: string;
}) {
  const money = (amountGbp: number) => formatGbpIn(amountGbp, currency);
  const spentGbp = exportCostGbp(promotionsSent);
  const percent = budgetUsedPercent(spentGbp);
  const over = spentGbp > GOOGLE_CONTRACT_BUDGET_GBP;
  const remainingGbp = Math.max(0, GOOGLE_CONTRACT_BUDGET_GBP - spentGbp);
  const remaining = over ? 0 : Math.min(100, Math.max(0, 100 - percent));

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          Contract budget
          <HelpHint hint={hint} placement="below" />
        </h2>
        <p className="text-sm text-muted [font-variant-numeric:tabular-nums]">
          {money(spentGbp)} of {money(GOOGLE_CONTRACT_BUDGET_GBP)}
        </p>
      </div>
      <div
        className="relative h-3 rounded-full bg-tint"
        role="meter"
        aria-label="Contract budget remaining"
        aria-valuemin={0}
        aria-valuemax={GOOGLE_CONTRACT_BUDGET_GBP}
        aria-valuenow={remainingGbp}
        aria-valuetext={`${money(remainingGbp)} remaining of ${money(GOOGLE_CONTRACT_BUDGET_GBP)}`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: `${remaining}%` }} />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-card bg-ok shadow"
          style={{ left: `clamp(0px, calc(${remaining}% - 10px), calc(100% - 20px))` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        {formatBudgetPercent(percent)} of the {money(GOOGLE_CONTRACT_BUDGET_GBP)} budget spent
        exporting promotions
        {over ? `, ${money(spentGbp - GOOGLE_CONTRACT_BUDGET_GBP)} over budget` : ""}. The bar is
        the budget still left. All time, every country.
      </p>
    </section>
  );
}

export default async function GoogleBillingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { clientView } = await requireGoogleBillingSession();
  const showInternalCosts = !clientView;
  const search = await searchParams;
  const filters = parseGoogleBillingSearch(search);
  const currency = parseBillingCurrency(search.currency);
  const hints = googleBillingHints(currency);
  const contractPromise = googleBillingHasNarrowing(filters) ? getGoogleBilling({}) : null;
  const [report, countryCodes] = await Promise.all([
    getGoogleBilling(filters),
    getGoogleBillingCountries(),
  ]);
  const contract = contractPromise ? await contractPromise : report;
  const totals: GoogleBillingTotals = report.totals;
  const period = describeGoogleBillingPeriod(filters, report.span);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Google billing</h1>
        <p className="text-xs text-muted">{period}</p>
      </div>

      <GoogleBillingFilterBar
        from={filters.from ?? ""}
        to={filters.to ?? ""}
        countries={countryCodes.map((code) => ({ value: code, label: googleCountryLabel(code) }))}
        selectedCountries={filters.countries ?? []}
        currency={currency}
      />

      <BudgetSlider
        promotionsSent={contract.totals.promotionsSent}
        currency={currency}
        hint={hints.contractBudget}
      />

      <div className="space-y-3">
        <Tile
          label="Promotion sources" hint={hints.sources}
          value={formatCount(totals.sourcesImported)}
          sub="SKU URLs imported"
        />
        <div className={`grid grid-cols-1 gap-3 ${showInternalCosts ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <Tile label="Promotions extracted" hint={hints.extracted} value={formatCount(totals.promotionsExtracted)} />
          <Tile
            label="Promotions qualified" hint={hints.qualified}
            value={formatCount(totals.promotionsQualified)}
            sub={shareOfExtracted(totals.promotionsQualified, totals.promotionsExtracted)}
          />
          {showInternalCosts && (
            <Tile
              label="Promotions validated" hint={hints.validated}
              value={formatCount(totals.promotionsValidated)}
              sub={shareOfQualified(totals.promotionsValidated, totals.promotionsQualified)}
            />
          )}
          <Tile
            label="Valid - Sent" hint={hints.sent}
            value={formatCount(totals.promotionsSent)}
            sub={shareOfQualified(totals.promotionsSent, totals.promotionsQualified)}
          />
        </div>
        {showInternalCosts && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Tile label="Proxy" hint={hints.proxy} value={formatGigabytes(totals.proxyBytes)} sub="traffic used" />
            <Tile label="LLM cost" hint={hints.llmCost} value={formatUsdIn(totals.llmCostUsd, currency)} sub={currency} />
            <Tile
              label="Budget spent" hint={hints.budgetSpent}
              value={formatBudgetSpent(totals.promotionsSent, currency)}
              sub={currency}
            />
          </div>
        )}
      </div>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">By country</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-1 pr-4"><TableHeaderLabel label="Country" hint={hints.country} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Sources" hint={hints.sources} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Extracted" hint={hints.extracted} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Qualified" hint={hints.qualified} /></th>
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="Validated" hint={hints.validated} /></th>}
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="Proxy" hint={hints.proxy} /></th>}
                <th className="py-1 pr-4"><TableHeaderLabel label="Valid - Sent" hint={hints.sent} /></th>
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="LLM cost" hint={hints.llmCost} /></th>}
                {showInternalCosts && <th className="py-1"><TableHeaderLabel label="Budget spent" hint={hints.budgetSpent} /></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {report.countries.map((row) => (
                <tr key={row.countryCode}>
                  <td className="py-1.5 pr-4">{googleCountryLabel(row.countryCode)}</td>
                  <td className="py-1.5 pr-4">{formatCount(row.sourcesImported)}</td>
                  <td className="py-1.5 pr-4">{formatCount(row.promotionsExtracted)}</td>
                  <td className="py-1.5 pr-4">{formatCount(row.promotionsQualified)}</td>
                  {showInternalCosts && (
                    <td className="py-1.5 pr-4">{formatCount(row.promotionsValidated)}</td>
                  )}
                  {showInternalCosts && (
                    <td className="py-1.5 pr-4">{formatGigabytes(row.proxyBytes)}</td>
                  )}
                  <td className="py-1.5 pr-4">{formatCount(row.promotionsSent)}</td>
                  {showInternalCosts && <td className="py-1.5 pr-4">{formatUsdIn(row.llmCostUsd, currency)}</td>}
                  {showInternalCosts && (
                    <td className="whitespace-nowrap py-1.5">{formatBudgetSpent(row.promotionsSent, currency)}</td>
                  )}
                </tr>
              ))}
              {report.countries.length === 0 && (
                <tr>
                  <td colSpan={showInternalCosts ? 9 : 5} className="py-6 text-center text-faint">
                    No Google daily stats in this period.
                  </td>
                </tr>
              )}
            </tbody>
            {report.countries.length > 0 && (
              <tfoot className="border-t border-line font-semibold text-ink">
                <tr>
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4">{formatCount(totals.sourcesImported)}</td>
                  <td className="py-2 pr-4">{formatCount(totals.promotionsExtracted)}</td>
                  <td className="py-2 pr-4">{formatCount(totals.promotionsQualified)}</td>
                  {showInternalCosts && (
                    <td className="py-2 pr-4">{formatCount(totals.promotionsValidated)}</td>
                  )}
                  {showInternalCosts && (
                    <td className="py-2 pr-4">{formatGigabytes(totals.proxyBytes)}</td>
                  )}
                  <td className="py-2 pr-4">{formatCount(totals.promotionsSent)}</td>
                  {showInternalCosts && <td className="py-2 pr-4">{formatUsdIn(totals.llmCostUsd, currency)}</td>}
                  {showInternalCosts && (
                    <td className="whitespace-nowrap py-2">{formatBudgetSpent(totals.promotionsSent, currency)}</td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {showInternalCosts && (
        <p className="text-xs text-faint">
          Budget spent is {formatGbp(GBP_PER_EXPORTED_PROMOTION)} per promotion sent back, calculated
          in GBP. LLM cost is the validation spend, stored in USD. Figures are shown in {currency},
          converting at a fixed rate of {GBP_TO_USD} ({formatUsd(GBP_TO_USD)} per £1).
        </p>
      )}

      <GoogleBillingGroupTable
        title="By bundle"
        headers={groupHeaders(
          [{ label: "Bundle", hint: hints.bundle }],
          showInternalCosts,
          hints
        )}
        rows={report.bundles.map((bundle) => ({
          key: bundle.bundleId,
          label: bundleLabel(bundle.bundleId),
          cells: billingCells(bundle, showInternalCosts, currency),
          countries: bundle.countries.map((country) => ({
            code: country.countryCode,
            label: googleCountryLabel(country.countryCode),
            cells: billingCells(country, showInternalCosts, currency),
          })),
        }))}
        totals={billingCells(totals, showInternalCosts, currency)}
      />

      <GoogleBillingGroupTable
        title="By day"
        headers={groupHeaders(
          [
            { label: "Day", hint: hints.day },
            { label: "Bundle", hint: hints.bundle },
          ],
          showInternalCosts,
          hints
        )}
        rows={report.days.map((day) => ({
          key: `${day.date}|${day.bundleId}`,
          label: formatUtcDay(day.date),
          cells: [bundleLabel(day.bundleId), ...billingCells(day, showInternalCosts, currency)],
          countries: day.countries.map((country) => ({
            code: country.countryCode,
            label: googleCountryLabel(country.countryCode),
            cells: ["", ...billingCells(country, showInternalCosts, currency)],
          })),
        }))}
        totals={["", ...billingCells(totals, showInternalCosts, currency)]}
      />
    </div>
  );
}
