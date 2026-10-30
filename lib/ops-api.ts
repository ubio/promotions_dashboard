import { NextResponse } from "next/server";
import { requireInternalSession } from "./auth";
import { isOpsConfigured } from "./ops-config";
import { OpsClient } from "./ops-client";

function opsNotConfigured() {
  return NextResponse.json(
    { error: "Ops is not configured (PROMOTIONS_SERVICE_URL, OPS_SECRET)" },
    { status: 503 }
  );
}

export async function runOpsExport() {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.exportSpreadsheets();
  return NextResponse.json(result);
}

export async function runOpsResetCandidates(page: number, pageSize: number) {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const candidates = await client.listResetCandidates(page, pageSize);
  return NextResponse.json(candidates);
}

export async function runOpsReset() {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.resetValidations();
  return NextResponse.json(result);
}

export async function runOpsResetSingle(promotionId: string) {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.resetSingleValidation(promotionId);
  return NextResponse.json(result);
}

export async function runOpsResetValidation(promotionId: string) {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.resetValidation(promotionId);
  return NextResponse.json(result);
}

const MAX_RESTART_VALIDATIONS = 100;

export async function runOpsResetValidations(promotionIds: string[]) {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const unique = [...new Set(promotionIds)];
  if (unique.length === 0) {
    return NextResponse.json({ error: "Choose at least one validation" }, { status: 400 });
  }
  if (unique.length > MAX_RESTART_VALIDATIONS) {
    return NextResponse.json({ error: "Too many validations selected" }, { status: 400 });
  }

  const client = OpsClient.fromEnv();
  const failed: { promotionId: string; error: string }[] = [];
  let resetCount = 0;
  for (const promotionId of unique) {
    try {
      await client.resetValidation(promotionId);
      resetCount += 1;
    } catch (error) {
      failed.push({
        promotionId,
        error: error instanceof Error ? error.message : "Reset failed",
      });
    }
  }

  if (resetCount === 0) {
    return NextResponse.json(
      { error: failed[0]?.error ?? "Reset failed", resetCount, failed },
      { status: 500 }
    );
  }
  return NextResponse.json({ resetCount, failed });
}

export async function runMarkMerchantBotDetected(merchantId: string) {
  await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.markMerchantBotDetected(merchantId);
  return NextResponse.json(result);
}

export async function runMarkMerchantBotDetectionFixed(merchantId: string) {
  const user = await requireInternalSession();
  if (!isOpsConfigured()) return opsNotConfigured();
  const client = OpsClient.fromEnv();
  const result = await client.markMerchantBotDetectionFixed(merchantId, user.email);
  return NextResponse.json(result);
}
