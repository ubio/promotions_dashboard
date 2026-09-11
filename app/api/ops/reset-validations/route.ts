import { runOpsReset } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return await runOpsReset();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
