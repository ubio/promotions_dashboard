import { NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import { buildValidationsCsv } from "@/lib/report-validations-csv";
import { parseReportSearch } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReportSearch(sp);
  const body = await buildValidationsCsv(filters);
  return csvResponse(
    body,
    `promotions-validations_${filters.from}_to_${filters.to}.csv`
  );
}
