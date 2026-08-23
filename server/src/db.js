import { MongoClient } from "mongodb";

let client;
let collection;

export async function connectDb() {
  if (!process.env.MONGODB_URI) return null;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "trie_connect");
  collection = db.collection("words");
  await collection.createIndex({ word: 1 }, { unique: true });
  return collection;
}

export function wordsCollection() {
  return collection;
}
