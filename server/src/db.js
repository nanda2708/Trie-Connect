import { MongoClient } from "mongodb";

let client;
let db;
let words;
let contacts;

export async function connectDb() {
  if (!process.env.MONGODB_URI) return null;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || "trie_connect");

  words = db.collection("words");
  contacts = db.collection("contacts");

  await words.createIndex({ word: 1 }, { unique: true });
  await contacts.createIndex({ name: 1 });
  await contacts.createIndex({ phone: 1 }, { unique: true });

  return db;
}

export function wordsCollection() {
  return words;
}

export function contactsCollection() {
  return contacts;
}
