import { NextRequest } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { getReport, parseReportSearch } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReportSearch(sp);
  const { rows, totals } = await getReport(filters);

  const headers = [
    filters.groupBy === "client"
      ? "Client"
      : filters.groupBy === "merchant"
        ? "Domain"
        : filters.groupBy === "day"
          ? "Date"
          : "Month",
    "Validation runs",
    "Reached a result",
    "No result",
    "Client-facing conclusions",
    "Automation issues",
    "Other",
    "Avg time (s)",
    "Total time (s)",
    "Timed runs",
    "LLM cost (USD)",
    "Revenue estimate (USD)",
  ];

  const line = (label: string, r: (typeof rows)[number] | typeof totals) => [
    label,
    r.runs,
    r.resolved,
    r.noResult,
    r.clientFacing,
    r.automationIssues,
    r.other,
    (r.avgTimeMs / 1000).toFixed(1),
    (r.totalTimeMs / 1000).toFixed(1),
    r.timedRuns,
    r.cost.toFixed(4),
    r.revenue == null ? "" : r.revenue.toFixed(2),
  ];

  const body = toCsv(headers, [
    ...rows.map((r) => line(r.key, r)),
    line("TOTAL", totals),
  ]);

  return csvResponse(body, `promotions-report_${filters.from}_to_${filters.to}.csv`);
}
