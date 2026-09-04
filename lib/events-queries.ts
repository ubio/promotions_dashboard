import type { Document, Filter } from "mongodb";
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

export async function getBotDetectionEvents(f: BotDetectionEventFilters): Promise<Paged<Document>> {
  const filter: Filter<EventDoc> = {};
  if (f.date) filter.detectedDate = f.date;
  if (f.clientId) filter.clientIds = f.clientId;
  if (f.status === "open") filter.resolvedAt = { $exists: false };
  if (f.status === "resolved") filter.resolvedAt = { $exists: true };
  if (f.q) {
    const rx = { $regex: escapeRegex(f.q), $options: "i" };
    filter.$or = [{ domain: rx }, { merchantId: f.q }, { triggerPromotionId: f.q }, { _id: f.q }];
  }
  return paginateEvents("merchantBotDetectionEvents", filter, f.page ?? 1, "detectedAt");
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

export async function getBotDetectionClientIds(): Promise<string[]> {
  const rows = await botDetectionColl().aggregate<{ _id: string }>([
    { $unwind: "$clientIds" },
    { $group: { _id: "$clientIds" } },
    { $sort: { _id: 1 } },
  ]).toArray();
  return rows.map((r) => r._id).filter(Boolean);
}

export async function getClientCsvClientIds(): Promise<string[]> {
  return (await clientCsvColl().distinct("clientId")).filter(Boolean) as string[];
}
