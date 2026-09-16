export function localValidationRunUrl(todayPromotionId: string): string {
  return `http://localhost:9200/workflows/src%2Fworkflows%2Fvalidation%2Fvalidation.workflow.ts?MOCK_PROMOTION_ID=${encodeURIComponent(todayPromotionId)}`;
}
