import { OTHER_FAIL_CODES } from "./fail-codes";

export const REPORT_COLUMN_HINTS = {
  runs: "Total validation runs in the selected period.",
  validations: "Total validation runs in the selected period.",
  reachedResult:
    "Runs that finished with a conclusion — the promotion was judged valid or invalid.",
  noResult: "Runs that ended as errors before reaching a conclusion.",
  clientFacing:
    "Conclusions the client can act on — a successful run, or a failed conclusion with a client-facing fail code.",
  automationIssues:
    "Runs tagged with automation fail codes — bot detection, agent errors, proxy issues, timeouts, and similar.",
  other: OTHER_FAIL_CODES.join(", "),
  promotionsSentToClient:
    "Promotions delivered to the client in export files during the selected period.",
  avgTime:
    "Average run duration. Runs with unusable timing data are excluded from the average.",
  llmCost: "Total LLM spend for validation runs in the selected period.",
} as const;
