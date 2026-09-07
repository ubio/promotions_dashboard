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

// Runs longer than this are not durations: some records (all errored, from
// 2026-08-28) store a wall-clock timestamp in `time` instead of elapsed ms.
// Rendering those as "29811772m" confuses readers, so show them as unknown.
export const MAX_PLAUSIBLE_DURATION_MS = 86_400_000;

export function formatDuration(ms?: number | null): string {
  if (ms == null) return "—";
  if (ms >= MAX_PLAUSIBLE_DURATION_MS) return "—";
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
    merchantAutomationIssues: "merchant_automation_issues",
  };
  return map[status] ?? status;
}

// For filtering: given a normalized status, all raw variants stored in the DB.
export function validityVariants(normalized: string): string[] {
  const variants: Record<string, string[]> = {
    cannot_validate: ["cannot_validate", "cannotValidate"],
    insufficient_validations: ["insufficient_validations", "insufficientValidations"],
    merchant_automation_issues: ["merchant_automation_issues", "merchantAutomationIssues"],
  };
  return variants[normalized] ?? [normalized];
}

export const VALIDITY_STATUSES = [
  "valid",
  "invalid",
  "cannot_validate",
  "merchant_automation_issues",
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

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function formatUtcDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatUtcMonth(yearMonth: string): string {
  return new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function sumLlmCosts(costs: unknown): number {
  if (!Array.isArray(costs)) return 0;
  return costs.reduce((s, c) => s + (Number((c as { totalCost?: number })?.totalCost) || 0), 0);
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
