export function formatDate(epochMs?: number | null): string {
  if (!epochMs) return "—";
  return new Date(epochMs).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDuration(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(totalSeconds / 60);
  return `${m}m ${totalSeconds % 60}s`;
}

// The DB contains both snake_case and camelCase variants of the same status.
export function normalizeValidity(status?: string | null): string {
  if (!status) return "unknown";
  const map: Record<string, string> = {
    cannotValidate: "cannot_validate",
    insufficientValidations: "insufficient_validations",
  };
  return map[status] ?? status;
}

// For filtering: given a normalized status, all raw variants stored in the DB.
export function validityVariants(normalized: string): string[] {
  const variants: Record<string, string[]> = {
    cannot_validate: ["cannot_validate", "cannotValidate"],
    insufficient_validations: ["insufficient_validations", "insufficientValidations"],
  };
  return variants[normalized] ?? [normalized];
}

export const VALIDITY_STATUSES = [
  "valid",
  "invalid",
  "cannot_validate",
  "insufficient_validations",
] as const;

export function truncate(s: string | undefined | null, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function formatCost(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return `$${v >= 0.1 ? v.toFixed(2) : v.toFixed(4)}`;
}

export function sumLlmCosts(costs: unknown): number {
  if (!Array.isArray(costs)) return 0;
  return costs.reduce((s, c) => s + (Number((c as { totalCost?: number })?.totalCost) || 0), 0);
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
