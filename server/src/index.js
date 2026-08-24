import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDb, contactsCollection, wordsCollection } from "./db.js";
import { command } from "./trieEngine.js";

const app = express();
const port = Number(process.env.PORT || 5000);

const NAME_KEY = "n:";
const PHONE_KEY = "p:";

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

function normalizeWord(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanWord(value) {
  const word = normalizeWord(value);
  if (!word) throw new Error("name must contain at least one letter or number");
  return word;
}

function cleanPhone(value) {
  const phone = String(value ?? "").trim();
  if (!/^\d{10}$/.test(phone)) {
    throw new Error("phone number must be exactly 10 digits");
  }
  return phone;
}

function contactView(contact) {
  if (!contact) return null;
  return {
    id: contact._id?.toString(),
    name: contact.displayName,
    phone: contact.phone,
    email: contact.email || "",
    notes: contact.notes || "",
  };
}

async function indexContact(contact) {
  await command("insert", `${NAME_KEY}${contact.name}`);
  await command("insert", `${PHONE_KEY}${contact.phone}`);
}

async function removeContactIndexes(contact) {
  await command("remove", `${NAME_KEY}${contact.name}`);
  await command("remove", `${PHONE_KEY}${contact.phone}`);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "trie-connect-api" });
});

app.get("/api/trie/search", async (req, res) => {
  try {
    const word = cleanWord(req.query.word || "");
    res.json(await command("search", word));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/trie/prefix", async (req, res) => {
  try {
    const prefix = cleanWord(req.query.prefix || "");
    const parsedLimit = Number(req.query.limit || 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 10, 1), 50);
    res.json(await command("prefix", prefix, limit));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/trie/insert", async (req, res) => {
  try {
    const word = cleanWord(req.body.word || "");
    const result = await command("insert", word);
    const collection = wordsCollection();
    if (collection) {
      await collection.updateOne(
        { word },
        { $set: { word, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
    }
    res.status(201).json({ ...result, word });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/trie/:word", async (req, res) => {
  try {
    const word = cleanWord(req.params.word);
    const result = await command("remove", word);
    const collection = wordsCollection();
    if (collection && result.removed) await collection.deleteOne({ word });
    res.json({ ...result, word });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/trie/stats", async (_req, res) => {
  try {
    res.json(await command("stats"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trie/load", async (req, res) => {
  try {
    if (!Array.isArray(req.body.words)) return res.status(400).json({ error: "words must be an array" });
    const selected = [...new Set(req.body.words.slice(0, 10000).map(normalizeWord).filter(Boolean))];
    for (const word of selected) await command("insert", word);
    const collection = wordsCollection();
    if (collection && selected.length) {
      const now = new Date();
      await collection.bulkWrite(selected.map(word => ({
        updateOne: {
          filter: { word },
          update: { $set: { word, updatedAt: now }, $setOnInsert: { createdAt: now } },
          upsert: true,
        },
      })));
    }
    res.json({ inserted: selected.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// MongoDB owns complete contact records. The C++ Trie indexes names and phone numbers.
app.get("/api/contacts", async (req, res) => {
  try {
    const collection = contactsCollection();
    if (!collection) return res.json([]);

    const query = String(req.query.q || "").trim();
    if (!query) {
      const contacts = await collection.find({}).sort({ displayName: 1 }).limit(200).toArray();
      return res.json(contacts.map(contactView));
    }

    const digits = query.replace(/\D/g, "");
    if (/^\d/.test(query)) {
      if (!digits) return res.json([]);
      const trieMatches = await command("prefix", `${PHONE_KEY}${digits}`, 50);
      const phones = (trieMatches.words || [])
        .filter(value => value.startsWith(PHONE_KEY))
        .map(value => value.slice(PHONE_KEY.length));
      const byPhone = phones.length ? await collection.find({ phone: { $in: phones } }).toArray() : [];
      return res.json(byPhone.map(contactView));
    }

    const prefix = normalizeWord(query);
    const trieMatches = prefix ? await command("prefix", `${NAME_KEY}${prefix}`, 50) : { words: [] };
    const names = (trieMatches.words || [])
      .filter(value => value.startsWith(NAME_KEY))
      .map(value => value.slice(NAME_KEY.length));
    const byName = names.length ? await collection.find({ name: { $in: names } }).toArray() : [];
    return res.json(byName.map(contactView));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const collection = contactsCollection();
    if (!collection) return res.status(503).json({ error: "MongoDB is not configured" });

    const displayName = String(req.body.name || "").trim();
    const name = cleanWord(displayName);
    const phone = cleanPhone(req.body.phone);
    const email = String(req.body.email || "").trim();
    const notes = String(req.body.notes || "").trim();
    const now = new Date();
    const document = { displayName, name, phone, email, notes, createdAt: now, updatedAt: now };

    const existing = await collection.findOne({ phone });
    if (existing) return res.status(409).json({ error: "A contact with this phone number already exists" });

    await collection.insertOne(document);
    await indexContact(document);
    res.status(201).json(contactView(document));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/contacts/:id", async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = contactsCollection();
    if (!collection) return res.status(503).json({ error: "MongoDB is not configured" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid contact id" });

    const _id = new ObjectId(req.params.id);
    const old = await collection.findOne({ _id });
    if (!old) return res.status(404).json({ error: "contact not found" });

    const displayName = String(req.body.name ?? old.displayName).trim();
    const name = cleanWord(displayName);
    const phone = cleanPhone(req.body.phone ?? old.phone);
    const email = String(req.body.email ?? old.email ?? "").trim();
    const notes = String(req.body.notes ?? old.notes ?? "").trim();
    const duplicate = await collection.findOne({ phone, _id: { $ne: _id } });
    if (duplicate) return res.status(409).json({ error: "A contact with this phone number already exists" });

    await collection.updateOne({ _id }, { $set: { displayName, name, phone, email, notes, updatedAt: new Date() } });

    if (old.name !== name || old.phone !== phone) {
      if (old.name !== name) {
        const stillUsedName = await collection.findOne({ name: old.name, _id: { $ne: _id } });
        if (!stillUsedName) await command("remove", `${NAME_KEY}${old.name}`);
      }
      if (old.phone !== phone) await command("remove", `${PHONE_KEY}${old.phone}`);
      await indexContact({ name, phone });
    }

    res.json(contactView(await collection.findOne({ _id })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = contactsCollection();
    if (!collection) return res.status(503).json({ error: "MongoDB is not configured" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid contact id" });

    const _id = new ObjectId(req.params.id);
    const contact = await collection.findOne({ _id });
    if (!contact) return res.status(404).json({ error: "contact not found" });

    await collection.deleteOne({ _id });
    const stillUsedName = await collection.findOne({ name: contact.name });
    const stillUsedPhone = await collection.findOne({ phone: contact.phone });
    if (!stillUsedName) await command("remove", `${NAME_KEY}${contact.name}`);
    if (!stillUsedPhone) await command("remove", `${PHONE_KEY}${contact.phone}`);

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/benchmark", async (req, res) => {
  try {
    const parsedSize = Number(req.query.size || 10000);
    const size = Math.min(Math.max(Number.isFinite(parsedSize) ? parsedSize : 10000, 100), 1000000);
    const prefix = cleanWord(req.query.prefix || "word999");
    res.json(await command("benchmark", size, prefix));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function hydrateTrie() {
  const collection = contactsCollection();
  if (!collection) return 0;
  const names = new Set();
  const phones = new Set();
  const cursor = collection.find({}, { projection: { name: 1, phone: 1, _id: 0 } });

  for await (const document of cursor) {
    const name = normalizeWord(document.name);
    if (name) names.add(name);
    const phone = String(document.phone || "").trim();
    if (/^\d{10}$/.test(phone)) phones.add(phone);
  }

  for (const name of names) await command("insert", `${NAME_KEY}${name}`);
  for (const phone of phones) await command("insert", `${PHONE_KEY}${phone}`);
  return names.size + phones.size;
}

connectDb()
  .then(async () => {
    const loaded = await hydrateTrie();
    if (loaded) console.log(`Loaded ${loaded} contact indexes from MongoDB into the Trie`);
    app.listen(port, () => console.log(`TrieConnect API running on http://localhost:${port}`));
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
