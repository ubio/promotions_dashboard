import { NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import { buildReportSummaryCsv } from "@/lib/report-summary-csv";
import { parseReportSearch } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReportSearch(sp);
  const body = await buildReportSummaryCsv(filters);
  return csvResponse(body, `promotions-report_${filters.from}_to_${filters.to}.csv`);
}
