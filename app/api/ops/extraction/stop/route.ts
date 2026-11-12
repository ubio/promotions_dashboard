import { runOpsStopExtraction } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return await runOpsStopExtraction();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stop extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
