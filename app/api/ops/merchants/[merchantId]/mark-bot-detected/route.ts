import { runMarkMerchantBotDetected } from "@/lib/ops-api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  try {
    const { merchantId } = await params;
    if (!merchantId) {
      return Response.json({ error: "merchantId is required" }, { status: 400 });
    }
    return await runMarkMerchantBotDetected(merchantId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark merchant as bot-detected";
    return Response.json({ error: message }, { status: 500 });
  }
}
