// Whether a promotion applies to the whole site or only to specific products.
// Mirrors promotions-service: `ZiffDavisAwsBucketExporter.resolveDataType` treats
// `applicability.type === "all products"` as site-wide and everything else as SKU, and
// `ProcessValidationService.ensureApplicability` derives the type from the product scope
// (`productIds` / `productName`) when a record has no applicability at all.
import type { Document, Filter } from "mongodb";

type PromoDoc = Document & { _id: string };

export enum PromotionApplicability {
  SiteWide = "site-wide",
  Sku = "sku",
}

export const PROMOTION_APPLICABILITIES: PromotionApplicability[] = [
  PromotionApplicability.SiteWide,
  PromotionApplicability.Sku,
];

const ALL_PRODUCTS_TYPE = "all products";

export class PromotionApplicabilityScope {
  of(doc: Document): PromotionApplicability {
    const type = this.applicabilityType(doc);
    if (type !== undefined) {
      return type === ALL_PRODUCTS_TYPE ? PromotionApplicability.SiteWide : PromotionApplicability.Sku;
    }
    return this.hasProductScope(doc) ? PromotionApplicability.Sku : PromotionApplicability.SiteWide;
  }

  label(applicability: PromotionApplicability): string {
    return applicability === PromotionApplicability.SiteWide ? "Site-wide" : "SKU";
  }

  parse(value: string | undefined): PromotionApplicability | undefined {
    return PROMOTION_APPLICABILITIES.find((applicability) => applicability === value);
  }

  productIds(doc: Document): string[] {
    if (!Array.isArray(doc.productIds)) return [];
    return doc.productIds.filter((id: unknown): id is string => typeof id === "string" && id !== "");
  }

  // Query equivalent of `of()`: the same split, expressed for Mongo.
  filter(applicability: PromotionApplicability): Filter<PromoDoc> {
    if (applicability === PromotionApplicability.SiteWide) return this.siteWide();
    return { $nor: [this.siteWide()] };
  }

  private siteWide(): Filter<PromoDoc> {
    return {
      $or: [
        { "applicability.type": ALL_PRODUCTS_TYPE },
        {
          "applicability.type": { $not: { $type: "string" } },
          productIds: { $not: { $elemMatch: { $type: "string", $ne: "" } } },
          productName: { $in: [null, ""] },
        },
      ],
    };
  }

  private applicabilityType(doc: Document): string | undefined {
    const type = doc.applicability?.type;
    return typeof type === "string" ? type : undefined;
  }

  private hasProductScope(doc: Document): boolean {
    return this.productIds(doc).length > 0 || (typeof doc.productName === "string" && doc.productName !== "");
  }
}

export const promotionApplicabilityScope = new PromotionApplicabilityScope();
