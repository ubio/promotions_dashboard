// Per-client revenue rates, e.g.
//   CLIENT_VALIDATION_RATES=ZiffDavis:0.25,Atoll:0.30
// DEFAULT_VALIDATION_RATE covers clients not listed. Rates are USD per
// promotion delivered to the client and produce a deliberately crude revenue
// estimate — real contracts have minimums, tiers and other terms this ignores.

export function clientRates(): Map<string, number> {
  const map = new Map<string, number>();
  for (const pair of (process.env.CLIENT_VALIDATION_RATES ?? "").split(",")) {
    const [clientId, rate] = pair.split(":").map((s) => s.trim());
    const parsed = Number(rate);
    if (clientId && Number.isFinite(parsed)) map.set(clientId, parsed);
  }
  return map;
}

export function defaultRate(): number | null {
  const parsed = Number(process.env.DEFAULT_VALIDATION_RATE);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rateFor(clientId: string | undefined, rates = clientRates()): number | null {
  if (clientId && rates.has(clientId)) return rates.get(clientId)!;
  return defaultRate();
}

export function ratesConfigured(): boolean {
  return clientRates().size > 0 || defaultRate() != null;
}
