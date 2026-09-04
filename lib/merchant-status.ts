export type MerchantHighlight = "onboarded" | "bot-detected";

export function parseMerchantStatus(value: string | undefined): MerchantHighlight | undefined {
  if (value === "onboarded" || value === "bot-detected") return value;
  return undefined;
}

export function merchantHighlight(merchant: {
  validationsAllowed?: boolean;
  scriptGenerated?: boolean;
  scriptReviewed?: boolean;
  botDetection?: boolean;
}): MerchantHighlight | undefined {
  if (merchant.validationsAllowed === false) return "bot-detected";
  if (
    merchant.scriptGenerated === true &&
    merchant.scriptReviewed === true &&
    merchant.botDetection === false
  ) {
    return "onboarded";
  }
  return undefined;
}

export function merchantHighlightClass(highlight: MerchantHighlight | undefined): string {
  if (highlight === "bot-detected") return "bg-[#fff4f4] hover:bg-[#ffecec]";
  if (highlight === "onboarded") return "bg-[#f3faf4] hover:bg-[#eaf6ec]";
  return "hover:bg-sky-50/50";
}

export function merchantHighlightLabel(highlight: MerchantHighlight | undefined): string {
  if (highlight === "bot-detected") return "Bot-detected";
  if (highlight === "onboarded") return "Onboarded";
  return "—";
}
