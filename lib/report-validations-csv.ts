import { toCsv } from "./csv";
import { isAutomationIssueRun, isClientFacingRun } from "./fail-codes";
import { formatCost, formatDate, sumLlmCosts } from "./format";
import { getValidationsForExport, type ReportFilters } from "./reports";

export const VALIDATION_OUTCOME_LABELS = {
  client_facing: "Client-facing",
  automation_issues: "Automation issues",
  no_result: "No result",
  other: "Other",
} as const;

type ValidationOutcome = keyof typeof VALIDATION_OUTCOME_LABELS;

function exportOutcome(r: {
  reportType?: string;
  success?: boolean;
  failCodes?: string[];
}): ValidationOutcome {
  if (isClientFacingRun(r)) return "client_facing";
  if (isAutomationIssueRun(r)) return "automation_issues";
  if (r.reportType === "error") return "no_result";
  return "other";
}

export async function buildValidationsCsv(filters: ReportFilters): Promise<string> {
  const runs = await getValidationsForExport(filters);

  const headers = [
    "Validation ID",
    "When",
    "Customer",
    "Merchant",
    "Promotion ID",
    "Code ID",
    "Outcome",
    "Fail codes",
    "Reasoning",
    "Duration",
    "LLM Cost",
    "Import bundle",
    "Source URL",
    "Screenshot",
  ];

  const rows = runs.map((r) => {
    const duration =
      r.time == null || r.time >= 86400000 ? "" : `${(r.time / 1000).toFixed(1)}s`;
    const cost = formatCost(sumLlmCosts(r.llmCosts));
    return [
      (r as { _id?: string })._id ?? "",
      formatDate(r.createdAt),
      r.clientId ?? "",
      r.domain ?? "",
      r.promotionId ?? "",
      r.promotionUniqId ?? "",
      VALIDATION_OUTCOME_LABELS[exportOutcome(r)],
      (r.failCodes ?? []).join(" "),
      r.reasoning ?? "",
      duration,
      cost === "—" ? "" : cost,
      r.importBundle ?? "",
      r.sourceUrl ?? "",
      r.screenshot ?? "",
    ];
  });

  return toCsv(headers, rows);
}
