import { runOpsResetSingle } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await runOpsResetSingle(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
