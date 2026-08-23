import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDb, wordsCollection } from "./db.js";
import { command } from "./trieEngine.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "trie-connect-api" });
});

app.get("/api/trie/search", async (req, res) => {
  try {
    const word = String(req.query.word || "").trim();
    if (!word) return res.status(400).json({ error: "word is required" });
    res.json(await command("search", word));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/trie/prefix", async (req, res) => {
  try {
    const prefix = String(req.query.prefix || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    if (!prefix) return res.status(400).json({ error: "prefix is required" });
    res.json(await command("prefix", prefix, limit));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trie/insert", async (req, res) => {
  try {
    const word = String(req.body.word || "").trim();
    if (!word) return res.status(400).json({ error: "word is required" });
    const result = await command("insert", word);
    const collection = wordsCollection();
    if (collection) {
      const normalized = word.toLowerCase();
      await collection.updateOne(
        { word: normalized },
        { $set: { word: normalized, updatedAt: new Date() } },
        { upsert: true }
      );
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/trie/:word", async (req, res) => {
  try {
    const word = String(req.params.word).trim();
    const result = await command("remove", word);
    const collection = wordsCollection();
    if (collection && result.removed) await collection.deleteOne({ word: word.toLowerCase() });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const words = Array.isArray(req.body.words) ? req.body.words : [];
    const selected = words.slice(0, 10000).map(String);
    for (const word of selected) await command("insert", word);

    const collection = wordsCollection();
    if (collection && selected.length) {
      const operations = selected.map(word => ({
        updateOne: {
          filter: { word: word.toLowerCase() },
          update: { $set: { word: word.toLowerCase(), updatedAt: new Date() } },
          upsert: true
        }
      }));
      await collection.bulkWrite(operations);
    }

    res.json({ inserted: selected.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/benchmark", async (req, res) => {
  try {
    const size = Math.min(Math.max(Number(req.query.size || 10000), 100), 1000000);
    const prefix = String(req.query.prefix || "word").trim();
    if (!prefix) return res.status(400).json({ error: "prefix is required" });
    res.json(await command("benchmark", size, prefix));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function hydrateTrie() {
  const collection = wordsCollection();
  if (!collection) return 0;

  let loaded = 0;
  const cursor = collection.find({}, { projection: { word: 1, _id: 0 } });
  for await (const document of cursor) {
    if (document.word) {
      await command("insert", document.word);
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
