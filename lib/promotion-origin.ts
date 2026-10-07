// How a todayPromotions record was created. Mirrors promotions-service
// `PromotionOrigin`; the field is optional there and absent on records written
// before it existed. Only the extraction pipeline sets `extractionLogId`, so an
// unlabelled record is extracted when it has one and a client import otherwise.
import type { Document, Filter } from "mongodb";

export enum PromotionOrigin {
  ClientImport = "clientImport",
  Extraction = "extraction",
  Discovery = "discovery",
}

type ExtractedPromotionOrigin = PromotionOrigin.Extraction | PromotionOrigin.Discovery;

export const EXTRACTED_PROMOTION_ORIGINS: ExtractedPromotionOrigin[] = [
  PromotionOrigin.Extraction,
  PromotionOrigin.Discovery,
];

// Extracted records written before `origin` existed: extraction or discovery is unknown.
export const UNLABELLED_EXTRACTED_ORIGIN = "unlabelled";

export type ExtractedOriginFilter = ExtractedPromotionOrigin | typeof UNLABELLED_EXTRACTED_ORIGIN;

export const EXTRACTED_ORIGIN_FILTERS: ExtractedOriginFilter[] = [
  ...EXTRACTED_PROMOTION_ORIGINS,
  UNLABELLED_EXTRACTED_ORIGIN,
];

type PromoDoc = Document & { _id: string };

export class PromotionOriginScope {
  clientImport(): Filter<PromoDoc> {
    return {
      $or: [
        { origin: PromotionOrigin.ClientImport },
        { origin: { $exists: false }, extractionLogId: { $exists: false } },
      ],
    };
  }

  extracted(origin?: ExtractedOriginFilter): Filter<PromoDoc> {
    if (origin === UNLABELLED_EXTRACTED_ORIGIN) return this.unlabelledExtracted();
    if (origin) return { origin };
    return {
      $or: [{ origin: { $in: EXTRACTED_PROMOTION_ORIGINS } }, this.unlabelledExtracted()],
    };
  }

  parseExtractedOrigin(value: string | undefined): ExtractedOriginFilter | undefined {
    return EXTRACTED_ORIGIN_FILTERS.find((origin) => origin === value);
  }

  originOf(doc: Document): string {
    if (typeof doc.origin === "string") return doc.origin;
    return doc.extractionLogId ? UNLABELLED_EXTRACTED_ORIGIN : PromotionOrigin.ClientImport;
  }

  private unlabelledExtracted(): Filter<PromoDoc> {
    return { origin: { $exists: false }, extractionLogId: { $exists: true } };
  }
}

export const promotionOriginScope = new PromotionOriginScope();
