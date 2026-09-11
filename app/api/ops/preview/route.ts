import { NextRequest } from "next/server";
import { runOpsResetCandidates } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
    const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? "25") || 25;
    return await runOpsResetCandidates(page, pageSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
