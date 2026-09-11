export function getPromotionsServiceUrl(): string | null {
  const url = process.env.PROMOTIONS_SERVICE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function getOpsSecret(): string | null {
  const secret = process.env.OPS_SECRET?.trim();
  if (!secret) return null;
  return secret;
}

export function isOpsConfigured(): boolean {
  return getPromotionsServiceUrl() != null && getOpsSecret() != null;
}
