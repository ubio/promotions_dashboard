import type { Collection, Document, Filter } from "mongodb";
import { escapeRegex } from "./format";
import { db, PROMOTIONS_COLLECTION } from "./mongo";
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

// Only what the Extractions table renders; full records carry raw extraction data.
const LIST_PROJECTION = {
  _id: 1,
  origin: 1,
  extractionLogId: 1,
  clientId: 1,
  domain: 1,
  countryCode: 1,
  description: 1,
  descriptionEn: 1,
  "conditions.code": 1,
  qualification: 1,
  "systemMeta.createdAt": 1,
} as const;

// The page itself plus its prefetched neighbours all ask for the same total and
// filter options at once; one query serves them, and paging reuses the result.
const COUNT_TTL_MS = 60_000;
const OPTIONS_TTL_MS = 5 * 60_000;
const MAX_CACHED_KEYS = 500;

class TtlCache<T> {
  private readonly entries = new Map<string, { at: number; value: Promise<T> }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;
    if (this.entries.size >= MAX_CACHED_KEYS) this.entries.clear();
    const value = load();
    this.entries.set(key, { at: Date.now(), value });
    value.catch(() => this.entries.delete(key));
    return value;
  }
}

export class ExtractedPromotionsQuery {
  private readonly counts = new TtlCache<number>(COUNT_TTL_MS);
  private readonly options = new TtlCache<string[]>(OPTIONS_TTL_MS);

  async list(f: ExtractedPromotionFilters): Promise<Paged<Document>> {
    const filter = this.filter(f);
    const total = await this.counts.get(this.countKey(f), () => this.promotions().countDocuments(filter));
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, f.page ?? 1), pages);
    const items = await this.promotions()
      .find(filter, { projection: LIST_PROJECTION })
      .sort({ "systemMeta.createdAt": -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();
    return { items, total, page, pages };
  }

  async clientIds(): Promise<string[]> {
    return this.options.get("clientId", () => this.distinctStrings("clientId"));
  }

  async domains(): Promise<string[]> {
    return this.options.get("domain", () => this.distinctStrings("domain"));
  }

  private countKey(f: ExtractedPromotionFilters): string {
    return JSON.stringify([f.origin ?? null, f.clientId ?? null, f.domain ?? null, f.q ?? null]);
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
    return db().collection<PromoDoc>(PROMOTIONS_COLLECTION);
  }
}

export const extractedPromotionsQuery = new ExtractedPromotionsQuery();
