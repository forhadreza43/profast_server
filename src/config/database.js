import { MongoClient, ServerApiVersion } from "mongodb";

let client;
let db;

export async function initDatabase() {
  const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@crudcluster.buy7rkc.mongodb.net/?retryWrites=true&w=majority&appName=crudCluster`;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("parcelDB");
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function getCollection(collectionName) {
  return getDb().collection(collectionName);
}
