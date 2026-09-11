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
