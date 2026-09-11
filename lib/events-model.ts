// Mirrors promotions-service event schemas.

export type MerchantBotDetectionSource = "auto";

export type MerchantBotDetectionEventType = "botDetection" | "scriptFailing";

export type MerchantBotDetectionResolution = "unlocked_for_retry" | "marked_fixed";

export interface ValidationScriptFailureLog {
  stageName: string;
  error: string;
}

export interface MerchantBotDetectionEvent {
  _id?: string;
  domain: string;
  merchantId: string;
  clientIds: string[];
  detectedAt: number;
  detectedDate: string;
  source: MerchantBotDetectionSource;
  eventType?: MerchantBotDetectionEventType;
  botDetectionCount?: number;
  scriptIssuesCount?: number;
  scriptFailures?: ValidationScriptFailureLog[];
  triggerClientId?: string;
  triggerPromotionId?: string;
  resolvedAt?: number;
  resolvedDate?: string;
  resolution?: MerchantBotDetectionResolution;
  resolvedBy?: string;
  notes?: string;
}

export type ClientCsvEventType = "client-record-import" | "promotions-export";

export type ZdPromotionType = "sku" | "site-wide";

export interface ClientCsvEvent {
  _id?: string;
  eventType: ClientCsvEventType;
  clientId: string;
  csvName: string;
  bundleId: string;
  bundleDate: string;
  dataType: ZdPromotionType;
  createdAt: number;
  createdAtDate: string;
  recordCount?: number;
}

export const CLIENT_CSV_EVENT_TYPES: ClientCsvEventType[] = [
  "client-record-import",
  "promotions-export",
];

export function formatClientCsvEventType(eventType: string): string {
  if (eventType === "client-record-import") return "CSV import";
  return "Promotions export";
}

export function formatBotDetectionResolution(resolution?: string): string {
  if (resolution === "unlocked_for_retry") return "Unlocked for retry";
  if (resolution === "marked_fixed") return "Marked fixed";
  return "—";
}

export function scriptFailuresFromEvent(event: {
  scriptFailures?: unknown;
}): ValidationScriptFailureLog[] {
  const failures = event.scriptFailures;
  if (!Array.isArray(failures)) return [];
  const result: ValidationScriptFailureLog[] = [];
  for (const failure of failures) {
    if (
      typeof failure !== "object" ||
      failure === null ||
      !("stageName" in failure) ||
      !("error" in failure) ||
      typeof failure.stageName !== "string" ||
      typeof failure.error !== "string"
    ) {
      continue;
    }
    result.push({ stageName: failure.stageName, error: failure.error });
  }
  return result;
}
