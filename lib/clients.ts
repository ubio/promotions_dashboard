// Edge-safe (imported by proxy.ts) — no Node-only imports here.
//
// Client access mapping. CLIENT_EMAIL_DOMAINS maps sign-in email domains to the
// clientId whose data those users may see, e.g.:
//   CLIENT_EMAIL_DOMAINS=ziffdavis.com:ZiffDavis,atollco.com:Atoll
// Internal staff domains stay in ALLOWED_EMAIL_DOMAINS and get the full dashboard.
//
// CLIENT_EMAIL_ALLOWLIST does the same for single addresses on domains we would
// never grant wholesale — a personal account used to check what a client sees:
//   CLIENT_EMAIL_ALLOWLIST=someone@gmail.com:ZiffDavis
// The most specific rule wins, so an exact address is matched before any domain.

export function internalDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function pairs(value: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (value ?? "").split(",")) {
    const [key, clientId] = pair.split(":").map((s) => s.trim());
    if (key && clientId) map.set(key.toLowerCase(), clientId);
  }
  return map;
}

export function clientDomainMap(): Map<string, string> {
  return pairs(process.env.CLIENT_EMAIL_DOMAINS);
}

export function clientEmailMap(): Map<string, string> {
  return pairs(process.env.CLIENT_EMAIL_ALLOWLIST);
}

export function resolveAccess(
  email: string
): { role: "internal" } | { role: "client"; clientId: string } | null {
  const address = email.trim().toLowerCase();

  // Exact address beats any domain rule, in both directions: it is the only way
  // to admit one account from a domain we don't trust, and naming an internal
  // address here deliberately pins that person to the client view.
  const byEmail = clientEmailMap().get(address);
  if (byEmail) return { role: "client", clientId: byEmail };

  const domain = address.split("@").pop() ?? "";
  if (internalDomains().includes(domain)) return { role: "internal" };
  const byDomain = clientDomainMap().get(domain);
  if (byDomain) return { role: "client", clientId: byDomain };
  return null;
}
