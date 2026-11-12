import { runOpsExtractionStatus } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return await runOpsExtractionStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loading extraction status failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
