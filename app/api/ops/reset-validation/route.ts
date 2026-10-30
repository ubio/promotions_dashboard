import { runOpsResetValidations } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

function promotionIdsFrom(body: unknown): string[] | null {
  if (body == null || typeof body !== "object" || !("promotionIds" in body)) return null;
  const value = body.promotionIds;
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) return null;
    ids.push(item);
  }
  return ids;
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const promotionIds = promotionIdsFrom(body);
  if (!promotionIds) {
    return Response.json({ error: "promotionIds is required" }, { status: 400 });
  }
  try {
    return await runOpsResetValidations(promotionIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
