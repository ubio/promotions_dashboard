import { getOpsSecret, getPromotionsServiceUrl } from "./ops-config";

export interface ResetCandidateRow {
  id: string;
  detailId?: string;
  clientId: string;
  domain: string;
  merchantName?: string;
  countryCode?: string;
  sourceUrl: string;
  uniqId: string;
  createdAtDate?: string;
  validityStatus?: string;
  reportType?: string;
  failCodes: string[];
}

export interface ResetCandidatesPage {
  date: string;
  from: string;
  to: string;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  byClient: Record<string, number>;
  items: ResetCandidateRow[];
}

export interface ResetResult {
  date: string;
  resetCount: number;
}

export interface ExportResult {
  ok: boolean;
  message: string;
}

export interface MerchantBotDetectionResult {
  merchant: {
    domain: string;
    botDetection?: boolean;
    validationsAllowed?: boolean;
    fixedBotDetection?: boolean;
    botDetectionCount?: number;
  };
}

export class OpsClient {
  private baseUrl: string;
  private secret: string;

  constructor(baseUrl: string, secret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.secret = secret;
  }

  static fromEnv(): OpsClient {
    const baseUrl = getPromotionsServiceUrl();
    const secret = getOpsSecret();
    if (!baseUrl || !secret) {
      throw new Error("PROMOTIONS_SERVICE_URL and OPS_SECRET must be configured");
    }
    return new OpsClient(baseUrl, secret);
  }

  async exportSpreadsheets(): Promise<ExportResult> {
    return this.post<ExportResult>("/Ops/exportSpreadsheets");
  }

  async listResetCandidates(page: number, pageSize = 25): Promise<ResetCandidatesPage> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return this.get<ResetCandidatesPage>(`/Ops/resetNonClientFacingValidations/preview?${params}`);
  }

  async resetValidations(): Promise<ResetResult> {
    return this.post<ResetResult>("/Ops/resetNonClientFacingValidations");
  }

  async resetSingleValidation(promotionId: string): Promise<ResetResult> {
    return this.post<ResetResult>("/Ops/resetNonClientFacingValidations/single", { promotionId });
  }

  async markMerchantBotDetected(merchantId: string): Promise<MerchantBotDetectionResult> {
    return this.post<MerchantBotDetectionResult>("/Ops/merchants/markBotDetected", { merchantId });
  }

  async markMerchantBotDetectionFixed(
    merchantId: string,
    resolvedBy?: string
  ): Promise<MerchantBotDetectionResult> {
    const body: Record<string, string> = { merchantId };
    if (resolvedBy) body.resolvedBy = resolvedBy;
    return this.post<MerchantBotDetectionResult>("/Ops/merchants/markBotDetectionFixed", body);
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.headers(),
      cache: "no-store",
    });
    return this.parseResponse<T>(res);
  }

  private async post<T>(path: string, body?: Record<string, string>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return this.parseResponse<T>(res);
  }

  private headers(): HeadersInit {
    return {
      "X-Ops-Secret": this.secret,
      "Content-Type": "application/json",
    };
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        body != null &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : `Request failed (${res.status})`;
      throw new Error(message);
    }
    return body as T;
  }
}
