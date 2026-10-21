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

// The Overview tiles. These are the first numbers anyone sees and the ones
// most often asked about in Slack, so each says what it counts and — where
// two tiles look alike — how it differs from its neighbour.
export const OVERVIEW_HINTS = {
  recordsReceived:
    "Promotions clients sent us to check, from their import files, in the selected period.",
  promotionsSentToClient:
    "Promotions we delivered back to the client in export files. Lower than records received, because not every promotion reaches a result.",
  llmCost: "What we spent with the language-model providers on these validation runs.",
  revenueEstimate:
    "Promotions sent to the client multiplied by that client's agreed rate. An estimate from the rates we hold, not billed figures.",
  validationRuns:
    "How many times we ran a check. Higher than the number of promotions, because a promotion is often retried.",
  resultsReached:
    "The share of runs that finished with a verdict. The rest stopped before reaching one — bot detection, timeouts and similar.",
  uniqueValidations:
    "Distinct promotions we attempted, counting each one once however many times it was retried.",
  uniqueResultsReached:
    "The share of those distinct promotions that got a verdict in the end. Usually higher than the per-run figure, because a retry often succeeds where the first attempt failed.",
} as const;
