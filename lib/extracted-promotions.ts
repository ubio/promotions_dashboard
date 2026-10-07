import type { Collection, Document, Filter } from "mongodb";
import { escapeRegex } from "./format";
import { db } from "./mongo";
import { type ExtractedOriginFilter, promotionOriginScope } from "./promotion-origin";
import { PAGE_SIZE, type Paged } from "./queries";

type PromoDoc = Document & { _id: string };

export interface ExtractedPromotionFilters {
  origin?: ExtractedOriginFilter;
  clientId?: string;
  domain?: string;
  q?: string;
  page?: number;
}

export class ExtractedPromotionsQuery {
  async list(f: ExtractedPromotionFilters): Promise<Paged<Document>> {
    const filter = this.filter(f);
    const total = await this.promotions().countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, f.page ?? 1), pages);
    const items = await this.promotions()
      .find(filter)
      .sort({ "systemMeta.createdAt": -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();
    return { items, total, page, pages };
  }

  async clientIds(): Promise<string[]> {
    return this.distinctStrings("clientId");
  }

  async domains(): Promise<string[]> {
    return this.distinctStrings("domain");
  }

  private filter(f: ExtractedPromotionFilters): Filter<PromoDoc> {
    const clauses: Filter<PromoDoc>[] = [promotionOriginScope.extracted(f.origin)];
    if (f.clientId) clauses.push({ clientId: f.clientId });
    if (f.domain) clauses.push({ domain: f.domain });
    if (f.q) {
      const rx = { $regex: escapeRegex(f.q), $options: "i" };
      clauses.push({
        $or: [
          { domain: rx },
          { sourceUrl: rx },
          { title: rx },
          { description: rx },
          { "conditions.code": rx },
          { uniqId: f.q },
          { extractionLogId: f.q },
          { _id: f.q },
        ],
      });
    }
    return { $and: clauses };
  }

  private async distinctStrings(field: "clientId" | "domain"): Promise<string[]> {
    const values = await this.promotions().distinct(field, promotionOriginScope.extracted());
    return values.filter((v): v is string => typeof v === "string" && v !== "").sort();
  }

  private promotions(): Collection<PromoDoc> {
    return db().collection<PromoDoc>("todayPromotions");
  }
}

export const extractedPromotionsQuery = new ExtractedPromotionsQuery();
