// Where full contact records live. The trie only knows ids; this is where
// the id turns back into a name, phone, email and notes.
//
// MongoDB is used when MONGODB_URI is set. Without it the API keeps records
// in memory, which is fine for local work and demos but lost on restart.

import { MongoClient, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";

function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function memoryStore() {
  const contacts = new Map();

  return {
    kind: "memory",
    async all(limit = Infinity) {
      return [...contacts.values()].sort(byName).slice(0, limit);
    },
    async count() {
      return contacts.size;
    },
    async get(id) {
      return contacts.get(id) ?? null;
    },
    async getMany(ids) {
      return ids.map(id => contacts.get(id)).filter(Boolean);
    },
    async phoneTaken(phone, exceptId) {
      for (const c of contacts.values()) if (c.phone === phone && c.id !== exceptId) return true;
      return false;
    },
    async create(fields) {
      const contact = { id: randomUUID().replace(/-/g, ""), ...fields };
      contacts.set(contact.id, contact);
      return contact;
    },
    async update(id, fields) {
      const contact = { ...contacts.get(id), ...fields, id };
      contacts.set(id, contact);
      return contact;
    },
    async remove(id) {
      contacts.delete(id);
    },
  };
}

async function mongoStore(uri, dbName) {
  // Fail in seconds rather than the driver's default 30s if Atlas is unreachable.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const collection = client.db(dbName).collection("contacts");
  await collection.createIndex({ phone: 1 }, { unique: true });

  // Earlier versions stored the typed name as `displayName` and a lowercased
  // copy as `name`. Normalising now happens in the index, so fold them back.
  await collection.updateMany({ displayName: { $exists: true } }, [
    { $set: { name: "$displayName" } },
    { $unset: "displayName" },
  ]);

  const toContact = doc => ({
    id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone,
    email: doc.email ?? "",
    notes: doc.notes ?? "",
  });
  const oid = id => (ObjectId.isValid(id) ? new ObjectId(id) : null);

  return {
    kind: "mongodb",
    async all(limit = 0) {
      const docs = await collection.find().sort({ name: 1 }).collation({ locale: "en" }).limit(limit).toArray();
      return docs.map(toContact);
    },
    async count() {
      return collection.estimatedDocumentCount();
    },
    async get(id) {
      const _id = oid(id);
      const doc = _id && (await collection.findOne({ _id }));
      return doc ? toContact(doc) : null;
    },
    async getMany(ids) {
      const docs = await collection.find({ _id: { $in: ids.map(oid).filter(Boolean) } }).toArray();
      // $in ignores order; keep the order the trie returned.
      const found = new Map(docs.map(doc => [doc._id.toString(), toContact(doc)]));
      return ids.map(id => found.get(id)).filter(Boolean);
    },
    async phoneTaken(phone, exceptId) {
      const filter = { phone };
      if (exceptId && oid(exceptId)) filter._id = { $ne: oid(exceptId) };
      return Boolean(await collection.findOne(filter, { projection: { _id: 1 } }));
    },
    async create(fields) {
      const now = new Date();
      const { insertedId } = await collection.insertOne({ ...fields, createdAt: now, updatedAt: now });
      return { id: insertedId.toString(), ...fields };
    },
    async update(id, fields) {
      await collection.updateOne({ _id: oid(id) }, { $set: { ...fields, updatedAt: new Date() } });
      return { id, ...fields };
    },
    async remove(id) {
      await collection.deleteOne({ _id: oid(id) });
    },
  };
}

// A bad MONGODB_URI shouldn't take the whole API down: search still works
// on memory storage, and /api/health says why it isn't using MongoDB.
export async function openStore() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return memoryStore();
  try {
    return await mongoStore(uri, process.env.MONGODB_DB || "trie_connect");
  } catch (error) {
    console.error(`MongoDB unavailable (${error.message}); falling back to memory storage`);
    return { ...memoryStore(), warning: `MongoDB unavailable: ${error.code || error.message}` };
  }
}
