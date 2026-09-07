import { NextRequest } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { getValidationsForExport, parseReportSearch } from "@/lib/reports";
import { sumLlmCosts } from "@/lib/format";

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
    r.reportType === "error" ? "errored" : r.success ? "passed" : "failed",
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
