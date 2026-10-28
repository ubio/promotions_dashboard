import GoogleBillingFilterBar from "@/components/google/GoogleBillingFilterBar";
import { requireGoogleBillingSession } from "@/lib/auth";
import { HelpHint, TableHeaderLabel } from "@/components/HelpHint";
import { formatCount } from "@/lib/format";
import {
  GBP_PER_EXPORTED_PROMOTION,
  GBP_TO_USD,
  GOOGLE_BILLING_HINTS,
  GOOGLE_CONTRACT_BUDGET_GBP,
  budgetUsedPercent,
  describeGoogleBillingPeriod,
  exportCostGbp,
  exportCostUsd,
  formatBudgetPercent,
  formatExportCost,
  formatGbp,
  formatGigabytes,
  formatSharePercent,
  formatUsd,
  qualifiedSharePercent,
  getGoogleBilling,
  getGoogleBillingCountries,
  googleBillingHasNarrowing,
  googleCountryLabel,
  parseGoogleBillingSearch,
  type GoogleBillingTotals,
} from "@/lib/google-billing";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

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

function BudgetSlider({ promotionsSent }: { promotionsSent: number }) {
  const spentGbp = exportCostGbp(promotionsSent);
  const spentUsd = exportCostUsd(promotionsSent);
  const percent = budgetUsedPercent(spentGbp);
  const over = spentGbp > GOOGLE_CONTRACT_BUDGET_GBP;
  const remainingGbp = Math.max(0, GOOGLE_CONTRACT_BUDGET_GBP - spentGbp);
  const remaining = over ? 0 : Math.min(100, Math.max(0, 100 - percent));

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          Contract budget
          <HelpHint hint={GOOGLE_BILLING_HINTS.contractBudget} placement="below" />
        </h2>
        <p className="text-sm text-muted [font-variant-numeric:tabular-nums]">
          {formatGbp(spentGbp)} of {formatGbp(GOOGLE_CONTRACT_BUDGET_GBP)}
          <span className="text-faint"> ({formatUsd(spentUsd)})</span>
        </p>
      </div>
      <div
        className="relative h-3 rounded-full bg-tint"
        role="meter"
        aria-label="Contract budget remaining"
        aria-valuemin={0}
        aria-valuemax={GOOGLE_CONTRACT_BUDGET_GBP}
        aria-valuenow={remainingGbp}
        aria-valuetext={`${formatGbp(remainingGbp)} remaining of ${formatGbp(GOOGLE_CONTRACT_BUDGET_GBP)}`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: `${remaining}%` }} />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-card bg-ok shadow"
          style={{ left: `clamp(0px, calc(${remaining}% - 10px), calc(100% - 20px))` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        {formatBudgetPercent(percent)} of the {formatGbp(GOOGLE_CONTRACT_BUDGET_GBP)} budget spent
        exporting promotions
        {over ? `, ${formatGbp(spentGbp - GOOGLE_CONTRACT_BUDGET_GBP)} over budget` : ""}. The bar is
        the budget still left. All time, every country.
      </p>
    </section>
  );
}

export default async function GoogleBillingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { clientView } = await requireGoogleBillingSession();
  const showInternalCosts = !clientView;
  const filters = parseGoogleBillingSearch(await searchParams);
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
      />

      <BudgetSlider promotionsSent={contract.totals.promotionsSent} />

      <div className="space-y-3">
        <Tile
          label="Promotion sources" hint={GOOGLE_BILLING_HINTS.sources}
          value={formatCount(totals.sourcesImported)}
          sub="SKU URLs imported"
        />
        <div className={`grid grid-cols-1 gap-3 ${showInternalCosts ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <Tile label="Promotions extracted" hint={GOOGLE_BILLING_HINTS.extracted} value={formatCount(totals.promotionsExtracted)} />
          <Tile
            label="Promotions qualified" hint={GOOGLE_BILLING_HINTS.qualified}
            value={formatCount(totals.promotionsQualified)}
            sub={shareOfExtracted(totals.promotionsQualified, totals.promotionsExtracted)}
          />
          {showInternalCosts && (
            <Tile
              label="Promotions validated" hint={GOOGLE_BILLING_HINTS.validated}
              value={formatCount(totals.promotionsValidated)}
              sub={shareOfQualified(totals.promotionsValidated, totals.promotionsQualified)}
            />
          )}
          <Tile
            label="Valid - Sent" hint={GOOGLE_BILLING_HINTS.sent}
            value={formatCount(totals.promotionsSent)}
            sub={shareOfQualified(totals.promotionsSent, totals.promotionsQualified)}
          />
        </div>
        {showInternalCosts && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Tile label="Proxy" hint={GOOGLE_BILLING_HINTS.proxy} value={formatGigabytes(totals.proxyBytes)} sub="traffic used" />
            <Tile label="LLM cost" hint={GOOGLE_BILLING_HINTS.llmCost} value={formatUsd(totals.llmCostUsd)} sub="USD" />
            <Tile
              label="Export cost" hint={GOOGLE_BILLING_HINTS.exportCost}
              value={formatUsd(exportCostUsd(totals.promotionsSent))}
              sub={`(${formatGbp(exportCostGbp(totals.promotionsSent))})`}
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
                <th className="py-1 pr-4"><TableHeaderLabel label="Country" hint={GOOGLE_BILLING_HINTS.country} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Sources" hint={GOOGLE_BILLING_HINTS.sources} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Extracted" hint={GOOGLE_BILLING_HINTS.extracted} /></th>
                <th className="py-1 pr-4"><TableHeaderLabel label="Qualified" hint={GOOGLE_BILLING_HINTS.qualified} /></th>
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="Validated" hint={GOOGLE_BILLING_HINTS.validated} /></th>}
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="Proxy" hint={GOOGLE_BILLING_HINTS.proxy} /></th>}
                <th className="py-1 pr-4"><TableHeaderLabel label="Valid - Sent" hint={GOOGLE_BILLING_HINTS.sent} /></th>
                {showInternalCosts && <th className="py-1 pr-4"><TableHeaderLabel label="LLM cost" hint={GOOGLE_BILLING_HINTS.llmCost} /></th>}
                {showInternalCosts && <th className="py-1"><TableHeaderLabel label="Export cost" hint={GOOGLE_BILLING_HINTS.exportCost} /></th>}
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
                  {showInternalCosts && <td className="py-1.5 pr-4">{formatUsd(row.llmCostUsd)}</td>}
                  {showInternalCosts && (
                    <td className="whitespace-nowrap py-1.5">{formatExportCost(row.promotionsSent)}</td>
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
                  {showInternalCosts && <td className="py-2 pr-4">{formatUsd(totals.llmCostUsd)}</td>}
                  {showInternalCosts && (
                    <td className="whitespace-nowrap py-2">{formatExportCost(totals.promotionsSent)}</td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {showInternalCosts && (
        <p className="text-xs text-faint">
          Export cost is {formatGbp(GBP_PER_EXPORTED_PROMOTION)} per promotion sent back, calculated in
          GBP and shown in USD at a fixed rate of {GBP_TO_USD} ({formatUsd(GBP_TO_USD)} per £1). LLM
          cost is the validation spend already stored in USD.
        </p>
      )}
    </div>
  );
}
