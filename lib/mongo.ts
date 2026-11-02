import { MongoClient } from "mongodb";

// Lazy so `next build` (no env) can import this module; fails at first use instead.
const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

function getClient(): MongoClient {
  if (!globalForMongo._mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    globalForMongo._mongoClient = new MongoClient(uri, {
      readPreference: "secondaryPreferred",
      serverSelectionTimeoutMS: 10000,
    });
  }
  return globalForMongo._mongoClient;
}

export function db() {
  return getClient().db("Promotions");
}

// Promotion records for every view. promotions-service keeps `todayPromotions`
// for one day only (TTL on systemMeta.expiresAt) and mirrors every insert and
// update into `latestPromotions`, which it retains for 30 days.
export const PROMOTIONS_COLLECTION = "latestPromotions";
