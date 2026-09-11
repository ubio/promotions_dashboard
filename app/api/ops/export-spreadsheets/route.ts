import { runOpsExport } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return await runOpsExport();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
