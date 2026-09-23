// Fail-code and validity-status sets copied from promotions-service
// (`schema/ValidationLog.ts`, `schema/PromotionValidityStatus.ts`).
// Keep in lockstep: client-facing vs debug is defined there, not here.

export const CLIENT_FACING_VALIDITY_STATUSES = ["valid", "invalid"] as const;

export const DEBUG_VALIDITY_STATUSES = ["invalid", "cannotValidate"] as const;

export const CLIENT_FACING_FAIL_CODES = [
  "PRODUCT_OUT_OF_STOCK",
  "PROMO_CODE_NOT_APPLICABLE_TO_THIS_PRODUCT",
  "PROMO_CODE_IS_NOT_WORKING",
  "DISCOUNT_IS_NOT_APPLIED",
  "FREE_SHIPPING_IS_NOT_APPLIED",
  "PROMOTION_CORRECTION",
  "SKU_PAGE_NOT_FOUND",
];

export const AUTOMATION_FAILURE_FAIL_CODES = [
  "A3_ERROR",
  "PROXY_CONNECTION_ISSUE",
  "LLM_COST_LIMIT",
  "AGENT_ERROR",
  "NETWORK_UNREACHABLE",
  "WORKFLOW_TIMEOUT",
  "PRODUCT_PERSONALIZATION_REQUIRED",
  "NEWSLETTERS_NOT_SUPPORTED",
  "REGISTRATION_REQUIRED",
  "BOT_DETECTION",
];

export const OTHER_FAIL_CODES = [
  "WEBSITE_ISSUE",
  "ACCOUNT_BLOCKED",
  "WEBSITE_LOADING_ISSUE",
  "WEBSITE_UI_ISSUE",
];

// FailCodesForDebug in promotions-service — not shared with clients as conclusions.
export const NON_CLIENT_FACING_FAIL_CODES = [
  ...AUTOMATION_FAILURE_FAIL_CODES,
  ...OTHER_FAIL_CODES,
];

function hasAny(failCodes: string[] | undefined, codes: string[]): boolean {
  return (failCodes ?? []).some((code) => codes.includes(code));
}

export function hasClientFacingFailCode(failCodes: string[] | undefined): boolean {
  return hasAny(failCodes, CLIENT_FACING_FAIL_CODES);
}

export function hasNonClientFacingFailCode(failCodes: string[] | undefined): boolean {
  return hasAny(failCodes, NON_CLIENT_FACING_FAIL_CODES);
}

// Plain English for debug / validation-issue fail codes shown in the client portal.
export const VALIDATION_ISSUE_LABELS: Record<string, string> = {
  BOT_DETECTION: "Bot detection",
  A3_ERROR: "Automation issue",
  LLM_COST_LIMIT: "Automation issue",
  PROXY_CONNECTION_ISSUE: "Automation issue",
  AGENT_ERROR: "Automation issue",
  NETWORK_UNREACHABLE: "Automation issue",
  WORKFLOW_TIMEOUT: "Automation issue",
  WEBSITE_UI_ISSUE: "Website UI preventing validation",
  WEBSITE_LOADING_ISSUE: "Website UI preventing validation",
  REGISTRATION_REQUIRED: "Validation requires user account",
  PRODUCT_PERSONALIZATION_REQUIRED: "Product requires personalization",
  NEWSLETTERS_NOT_SUPPORTED: "Newsletter signup required",
  WEBSITE_ISSUE: "Website UI preventing validation",
  ACCOUNT_BLOCKED: "Account blocked on merchant site",
};

export function validationIssueLabel(code: string): string {
  if (code === "__none__") return "Validation could not be completed";
  return VALIDATION_ISSUE_LABELS[code] ?? "Validation could not be completed";
}

// Mirrors TodayPromotionStorage.isClientFacingPromotionExpr() and
// PromotionToSheetExport.isClientFacingPromotion().
export function isClientFacingPromotion(
  validityStatus: string | undefined,
  failCodes: string[] | undefined
): boolean {
  if (validityStatus === "valid") return true;
  if (!hasClientFacingFailCode(failCodes)) return false;
  return validityStatus === "invalid" || validityStatus === "cannotValidate";
}

export function isClientFacingRun(r: {
  reportType?: string;
  success?: boolean;
  failCodes?: string[];
}): boolean {
  if (r.reportType !== "conclusion") return false;
  return r.success === true || hasClientFacingFailCode(r.failCodes);
}

export function isAutomationIssueRun(r: { failCodes?: string[] }): boolean {
  return hasAny(r.failCodes, AUTOMATION_FAILURE_FAIL_CODES);
}
