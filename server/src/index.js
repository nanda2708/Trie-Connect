import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDb, wordsCollection } from "./db.js";
import { command } from "./trieEngine.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

function normalizeWord(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanWord(value) {
  const word = normalizeWord(value);
  if (!word) throw new Error("word must contain at least one letter or number");
  return word;
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
        { upsert: true }
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
    if (!Array.isArray(req.body.words)) {
      return res.status(400).json({ error: "words must be an array" });
    }

    const selected = [...new Set(req.body.words.slice(0, 10000).map(normalizeWord).filter(Boolean))];
    for (const word of selected) await command("insert", word);

    const collection = wordsCollection();
    if (collection && selected.length) {
      const now = new Date();
      await collection.bulkWrite(selected.map(word => ({
        updateOne: {
          filter: { word },
          update: { $set: { word, updatedAt: now }, $setOnInsert: { createdAt: now } },
          upsert: true
        }
      })));
    }

    res.json({ inserted: selected.length });
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
  const collection = wordsCollection();
  if (!collection) return 0;

  let loaded = 0;
  const cursor = collection.find({}, { projection: { word: 1, _id: 0 } });
  for await (const document of cursor) {
    const word = normalizeWord(document.word);
    if (word) {
      await command("insert", word);
      loaded += 1;
    }
  }
  return loaded;
}

connectDb()
  .then(async () => {
    const loaded = await hydrateTrie();
    if (loaded) console.log(`Loaded ${loaded} words from MongoDB into the Trie`);
    app.listen(port, () => console.log(`TrieConnect API running on http://localhost:${port}`));
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
