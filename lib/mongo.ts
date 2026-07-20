import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

// Reuse a single client across hot reloads / route renders.
const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

export const mongo =
  globalForMongo._mongoClient ??
  new MongoClient(uri, {
    readPreference: "secondaryPreferred",
    serverSelectionTimeoutMS: 10000,
  });

if (!globalForMongo._mongoClient) globalForMongo._mongoClient = mongo;

export function db() {
  return mongo.db("Promotions");
}
