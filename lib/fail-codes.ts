// Fail-code sets copied from promotions-service `schema/ValidationLog.ts`.
// Keep in lockstep: a client-facing conclusion and an automation issue are
// defined there, not here.

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
  "BOT_DETECTION",
];

function hasAny(failCodes: string[] | undefined, codes: string[]): boolean {
  return (failCodes ?? []).some((code) => codes.includes(code));
}

export function isClientFacingRun(r: {
  reportType?: string;
  success?: boolean;
  failCodes?: string[];
}): boolean {
  if (r.reportType !== "conclusion") return false;
  return r.success === true || hasAny(r.failCodes, CLIENT_FACING_FAIL_CODES);
}

export function isAutomationIssueRun(r: { failCodes?: string[] }): boolean {
  return hasAny(r.failCodes, AUTOMATION_FAILURE_FAIL_CODES);
}
