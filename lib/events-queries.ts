import type { Document, Filter } from "mongodb";
import type { MerchantBotDetectionEventType } from "./events-model";
import { escapeRegex } from "./format";
import { db } from "./mongo";
import { PAGE_SIZE, type Paged } from "./queries";

type EventDoc = Document & { _id: string };

function botDetectionColl() {
  return db().collection<EventDoc>("merchantBotDetectionEvents");
}

function clientCsvColl() {
  return db().collection<EventDoc>("clientCsvEvents");
}

async function paginateEvents(
  collection: "merchantBotDetectionEvents" | "clientCsvEvents",
  filter: Filter<EventDoc>,
  page: number,
  sortField: "detectedAt" | "createdAt"
): Promise<Paged<Document>> {
  const c = collection === "merchantBotDetectionEvents" ? botDetectionColl() : clientCsvColl();
  const total = await c.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const items = await c
    .find(filter)
    .sort({ [sortField]: -1 })
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();
  return { items, total, page: safePage, pages };
}

export interface BotDetectionEventFilters {
  q?: string;
  date?: string;
  clientId?: string;
  status?: string; // "open" | "resolved"
  page?: number;
}

function merchantEventTypeFilter(eventType: MerchantBotDetectionEventType): Filter<EventDoc> {
  if (eventType === "botDetection") {
    return {
      $or: [{ eventType: "botDetection" }, { eventType: { $exists: false } }],
    };
  }
  return { eventType };
}

function merchantEventFilter(
  f: BotDetectionEventFilters,
  eventType: MerchantBotDetectionEventType
): Filter<EventDoc> {
  const clauses: Filter<EventDoc>[] = [merchantEventTypeFilter(eventType)];
  if (f.date) clauses.push({ detectedDate: f.date });
  if (f.clientId) clauses.push({ clientIds: f.clientId });
  if (f.status === "open") clauses.push({ resolvedAt: { $exists: false } });
  if (f.status === "resolved") clauses.push({ resolvedAt: { $exists: true } });
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    const search: Filter<EventDoc>[] = [
      { domain: rx },
      { merchantId: f.q },
      { triggerPromotionId: f.q },
      { _id: f.q },
    ];
    if (eventType === "scriptFailing") {
      search.push({ "scriptFailures.stageName": rx }, { "scriptFailures.error": rx });
    }
    clauses.push({ $or: search });
  }
  return { $and: clauses };
}

export async function getBotDetectionEvents(f: BotDetectionEventFilters): Promise<Paged<Document>> {
  return paginateEvents(
    "merchantBotDetectionEvents",
    merchantEventFilter(f, "botDetection"),
    f.page ?? 1,
    "detectedAt"
  );
}

export async function getScriptFailingEvents(f: BotDetectionEventFilters): Promise<Paged<Document>> {
  return paginateEvents(
    "merchantBotDetectionEvents",
    merchantEventFilter(f, "scriptFailing"),
    f.page ?? 1,
    "detectedAt"
  );
}

export interface ClientCsvEventFilters {
  q?: string;
  date?: string;
  clientId?: string;
  eventType?: string;
  page?: number;
}

export async function getClientCsvEvents(f: ClientCsvEventFilters): Promise<Paged<Document>> {
  const filter: Filter<EventDoc> = {};
  if (f.date) filter.createdAtDate = f.date;
  if (f.clientId) filter.clientId = f.clientId;
  if (f.eventType === "client-record-import" || f.eventType === "promotions-export") {
    filter.eventType = f.eventType;
  }
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [{ csvName: rx }, { bundleId: rx }, { _id: f.q }];
  }
  return paginateEvents("clientCsvEvents", filter, f.page ?? 1, "createdAt");
}

function csvImportTurnaroundKey(bundleId: string, dataType: string): string {
  return `${bundleId}\t${dataType}`;
}

function csvImportKeyFromEvent(event: Document): { bundleId: string; dataType: string } | null {
  if (event.eventType !== "client-record-import") return null;
  const bundleId = event.bundleId;
  const dataType = event.dataType;
  if (typeof bundleId !== "string" || !bundleId || typeof dataType !== "string" || !dataType) {
    return null;
  }
  return { bundleId, dataType };
}

// Matching promotions-export createdAt for the same bundle + data type, so an
// import row can show how long that file took to come back to the client.
export async function getCsvImportDeliveredAt(items: Document[]): Promise<Map<string, number>> {
  const bundleIds = [
    ...new Set(
      items.flatMap((event) => {
        const key = csvImportKeyFromEvent(event);
        return key ? [key.bundleId] : [];
      })
    ),
  ];
  if (bundleIds.length === 0) return new Map();
  const rows = await clientCsvColl()
    .aggregate<{ _id: { bundleId: string; dataType: string }; deliveredAt: number }>([
      { $match: { eventType: "promotions-export", bundleId: { $in: bundleIds } } },
      {
        $group: {
          _id: { bundleId: "$bundleId", dataType: "$dataType" },
          deliveredAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();
  return new Map(
    rows
      .filter((r) => r._id.bundleId && r._id.dataType && r.deliveredAt)
      .map((r) => [csvImportTurnaroundKey(r._id.bundleId, r._id.dataType), r.deliveredAt])
  );
}

export function csvImportTurnaroundMs(
  event: Document,
  deliveredAt: Map<string, number>
): number | null {
  const key = csvImportKeyFromEvent(event);
  const createdAt = event.createdAt;
  if (!key || typeof createdAt !== "number") return null;
  const delivered = deliveredAt.get(csvImportTurnaroundKey(key.bundleId, key.dataType));
  if (delivered == null || delivered < createdAt) return null;
  return delivered - createdAt;
}

async function getMerchantEventClientIds(
  eventType: MerchantBotDetectionEventType
): Promise<string[]> {
  const rows = await botDetectionColl()
    .aggregate<{ _id: string }>([
      { $match: merchantEventTypeFilter(eventType) },
      { $unwind: "$clientIds" },
      { $group: { _id: "$clientIds" } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return rows.map((r) => r._id).filter(Boolean);
}

export async function getBotDetectionClientIds(): Promise<string[]> {
  return getMerchantEventClientIds("botDetection");
}

export async function getScriptFailingClientIds(): Promise<string[]> {
  return getMerchantEventClientIds("scriptFailing");
}

export async function getClientCsvClientIds(): Promise<string[]> {
  return (await clientCsvColl().distinct("clientId")).filter(Boolean) as string[];
}
