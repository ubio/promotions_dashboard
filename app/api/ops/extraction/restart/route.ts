import { runOpsRestartExtraction } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return await runOpsRestartExtraction();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restart extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
