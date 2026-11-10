// Every money figure on /billing/google is shown in one currency, picked with
// the `currency` search param (USD by default). Contract figures are GBP and
// LLM cost is USD at source; the other currency is converted at the fixed
// GBP_TO_USD rate, the median GBP–USD over the past 10 years, not a live quote.
// Kept free of server imports so the client filter bar can use it.
export const GBP_TO_USD = 1.3;

export const BILLING_CURRENCIES = ["USD", "GBP"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];
export const DEFAULT_BILLING_CURRENCY: BillingCurrency = "USD";

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const gbpFormat = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function parseBillingCurrency(value: string | string[] | undefined): BillingCurrency {
  const raw = typeof value === "string" ? value.toUpperCase() : undefined;
  return BILLING_CURRENCIES.find((currency) => currency === raw) ?? DEFAULT_BILLING_CURRENCY;
}

export function formatUsd(amount: number): string {
  return usdFormat.format(amount);
}

export function formatGbp(amount: number): string {
  return gbpFormat.format(amount);
}

export function fromGbp(amountGbp: number, currency: BillingCurrency): number {
  return currency === "GBP" ? amountGbp : amountGbp * GBP_TO_USD;
}

export function fromUsd(amountUsd: number, currency: BillingCurrency): number {
  return currency === "USD" ? amountUsd : amountUsd / GBP_TO_USD;
}

export function formatMoney(amount: number, currency: BillingCurrency): string {
  return currency === "GBP" ? formatGbp(amount) : formatUsd(amount);
}

export function formatGbpIn(amountGbp: number, currency: BillingCurrency): string {
  return formatMoney(fromGbp(amountGbp, currency), currency);
}

export function formatUsdIn(amountUsd: number, currency: BillingCurrency): string {
  return formatMoney(fromUsd(amountUsd, currency), currency);
}
