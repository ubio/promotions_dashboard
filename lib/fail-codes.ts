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

// Plain-English explanations shown to clients beside each issue label.
//
// Keyed by LABEL, not by fail code: getPortalValidationIssueReasons groups the
// codes by their label and returns the label as `code`, so several fail codes
// arrive here as one row. Keying by code silently fell through to the generic
// text for every row.
//
// Written for someone outside UBIO: say what happened on the merchant's site
// and what it means for their offer, without naming our tooling, our costs or
// the internals of how a check runs. An issue is never a verdict on the offer
// so say so where it could be mistaken for one.
const VALIDATION_ISSUE_HINTS_BY_LABEL: Record<string, string> = {
  "Bot detection":
    "The merchant's site identified our check as automated traffic and blocked it, so the offer could not be verified. It tells you nothing about whether the offer works.",
  "Automation issue":
    "Our check did not finish on this merchant's site. The offer has not been judged either way. These are retried on our side.",
  "Website UI preventing validation":
    "The page behaved in a way the check could not follow: a layout change, a popup, or a step that did not load.",
  "Validation requires user account":
    "The offer could only be reached from inside a signed-in account. We do not create accounts on merchant sites, so it could not be checked.",
  "Product requires personalization":
    "The product needed options chosen, such as a size or a configuration, before the offer could be applied, so the check could not complete.",
  "Newsletter signup required":
    "The offer is only released after subscribing to the merchant's newsletter, which we do not do on your behalf.",
  "Account blocked on merchant site":
    "The merchant's site blocked the account the check was using, so the offer could not be verified.",
  "Validation could not be completed":
    "The check stopped before reaching a verdict and did not record a specific reason. These are retried on our side.",
};

// Takes the label the portal groups by, or a raw fail code as a fallback.
export function validationIssueHint(labelOrCode: string): string {
  const direct = VALIDATION_ISSUE_HINTS_BY_LABEL[labelOrCode];
  if (direct) return direct;
  const viaCode = VALIDATION_ISSUE_HINTS_BY_LABEL[validationIssueLabel(labelOrCode)];
  if (viaCode) return viaCode;
  return "Our check could not finish for this offer. It has not been judged either way. These are retried on our side.";
}
