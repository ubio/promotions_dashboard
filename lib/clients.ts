// Edge-safe (imported by proxy.ts) — no Node-only imports here.
//
// Client access mapping. CLIENT_EMAIL_DOMAINS maps sign-in email domains to the
// clientId whose data those users may see, e.g.:
//   CLIENT_EMAIL_DOMAINS=ziffdavis.com:ZiffDavis,atollco.com:Atoll
// Internal staff domains stay in ALLOWED_EMAIL_DOMAINS and get the full dashboard.

export function internalDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function clientDomainMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.CLIENT_EMAIL_DOMAINS ?? "").split(",")) {
    const [domain, clientId] = pair.split(":").map((s) => s.trim());
    if (domain && clientId) map.set(domain.toLowerCase(), clientId);
  }
  return map;
}

export function resolveAccess(
  email: string
): { role: "internal" } | { role: "client"; clientId: string } | null {
  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  if (internalDomains().includes(domain)) return { role: "internal" };
  const clientId = clientDomainMap().get(domain);
  if (clientId) return { role: "client", clientId };
  return null;
}
