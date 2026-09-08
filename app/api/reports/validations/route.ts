import { NextRequest } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { getValidationsForExport, parseReportSearch } from "@/lib/reports";
import { isAutomationIssueRun, isClientFacingRun } from "@/lib/fail-codes";
import { sumLlmCosts } from "@/lib/format";

function exportOutcome(r: {
  reportType?: string;
  success?: boolean;
  failCodes?: string[];
}): string {
  if (isClientFacingRun(r)) return "client_facing";
  if (isAutomationIssueRun(r)) return "automation_issues";
  if (r.reportType === "error") return "no_result";
  return "other";
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReportSearch(sp);
  const runs = await getValidationsForExport(filters);

  const headers = [
    "Validation ID",
    "Timestamp (UTC)",
    "Client",
    "Domain",
    "Promotion ID",
    "Code ID",
    "Outcome",
    "Fail codes",
    "Reasoning",
    "Duration (s)",
    "LLM cost (USD)",
    "Import bundle",
    "Source URL",
    "Screenshot",
  ];

  const rows = runs.map((r) => [
    (r as { _id?: string })._id ?? "",
    new Date(r.createdAt).toISOString(),
    r.clientId ?? "",
    r.domain ?? "",
    r.promotionId ?? "",
    r.promotionUniqId ?? "",
    exportOutcome(r),
    (r.failCodes ?? []).join(" "),
    r.reasoning ?? "",
    r.time == null ? "" : (r.time / 1000).toFixed(1),
    sumLlmCosts(r.llmCosts).toFixed(4),
    r.importBundle ?? "",
    r.sourceUrl ?? "",
    r.screenshot ?? "",
  ]);

  return csvResponse(
    toCsv(headers, rows),
    `promotions-validations_${filters.from}_to_${filters.to}.csv`
  );
}
