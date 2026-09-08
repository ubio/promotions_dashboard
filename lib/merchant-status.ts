export type MerchantHighlight = "onboarded" | "bot-detected";

export function parseMerchantStatus(value: string | undefined): MerchantHighlight | undefined {
  if (value === "onboarded" || value === "bot-detected") return value;
  return undefined;
}

// Field predicates that match merchantHighlight(), so a status filter
// returns the same merchants the Status column would label that way.
export function merchantStatusFields(status: MerchantHighlight): {
  validationsAllowed?: boolean | { $ne: false };
  scriptGenerated?: boolean;
  scriptReviewed?: boolean;
  botDetection?: boolean;
} {
  if (status === "bot-detected") {
    return { validationsAllowed: false };
  }
  return {
    scriptGenerated: true,
    scriptReviewed: true,
    botDetection: false,
    validationsAllowed: { $ne: false },
  };
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
