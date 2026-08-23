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
    if (collection) await collection.updateOne({ word: word.toLowerCase() }, { $set: { word: word.toLowerCase(), updatedAt: new Date() } }, { upsert: true });
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
  try { res.json(await command("stats")); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/trie/load", async (req, res) => {
  try {
    const words = Array.isArray(req.body.words) ? req.body.words : [];
    for (const word of words.slice(0, 10000)) await command("insert", String(word));
    res.json({ inserted: Math.min(words.length, 10000) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

connectDb()
  .then(() => app.listen(port, () => console.log(`TrieConnect API running on http://localhost:${port}`)))
  .catch(error => { console.error("MongoDB connection failed:", error.message); process.exit(1); });
