import "dotenv/config";
import cors from "cors";
import express from "express";
import { readFile } from "node:fs/promises";
import { send, whenRestarted } from "./engine.js";
import * as searchIndex from "./searchIndex.js";
import { openStore } from "./store.js";

const port = Number(process.env.PORT || 5000);
const store = await openStore();

class BadRequest extends Error {
  status = 400;
}

// Express 5 forwards rejected promises to the error handler, so routes can
// just throw.
function validate(body, current = {}) {
  const name = String(body.name ?? current.name ?? "").trim().slice(0, 80);
  const phone = String(body.phone ?? current.phone ?? "").trim();
  const email = String(body.email ?? current.email ?? "").trim().slice(0, 120);
  const notes = String(body.notes ?? current.notes ?? "").trim().slice(0, 500);

  if (!searchIndex.tokenize(name).length) throw new BadRequest("name needs at least one letter or number");
  if (!/^\d{10}$/.test(phone)) throw new BadRequest("phone number must be exactly 10 digits");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequest("that email doesn't look right");

  return { name, phone, email, notes };
}

async function findContact(id) {
  const contact = await store.get(id);
  if (!contact) {
    const error = new Error("contact not found");
    error.status = 404;
    throw error;
  }
  return contact;
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: store.kind, ...(store.warning && { warning: store.warning }) });
});

app.get("/api/stats", async (_req, res) => {
  const [trie, contacts] = await Promise.all([send("stats"), store.count()]);
  res.json({ trie, contacts, storage: store.kind });
});

app.get("/api/contacts", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    return res.json({ contacts: await store.all(200), search: null });
  }
  const { ids, ...search } = await searchIndex.search(query);
  let contacts = await store.getMany(ids);
  if (search.mode === "name") contacts = contacts.filter(c => searchIndex.wordsMatch(c.name, query));
  res.json({ contacts, search });
});

app.post("/api/contacts", async (req, res) => {
  const fields = validate(req.body ?? {});
  if (await store.phoneTaken(fields.phone)) {
    return res.status(409).json({ error: "a contact with this phone number already exists" });
  }
  const contact = await store.create(fields);
  await searchIndex.add(contact);
  res.status(201).json(contact);
});

app.put("/api/contacts/:id", async (req, res) => {
  const before = await findContact(req.params.id);
  const fields = validate(req.body ?? {}, before);
  if (await store.phoneTaken(fields.phone, before.id)) {
    return res.status(409).json({ error: "a contact with this phone number already exists" });
  }
  const after = await store.update(before.id, fields);
  await searchIndex.replace(before, after);
  res.json(after);
});

app.delete("/api/contacts/:id", async (req, res) => {
  const contact = await findContact(req.params.id);
  await store.remove(contact.id);
  await searchIndex.remove(contact);
  res.status(204).end();
});

app.get("/api/trie/walk", async (req, res) => {
  res.json(await searchIndex.walk(req.query.q ?? ""));
});

app.get("/api/benchmark", async (req, res) => {
  const size = Math.min(Math.max(Number(req.query.size) || 10000, 100), 1_000_000);
  const prefix = searchIndex.tokenize(req.query.prefix ?? "").join("") || "word999";
  res.json(await send("bench", size, prefix));
});

app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "something went wrong on the server" : error.message });
});

async function rebuildIndex() {
  const contacts = await store.all();
  await Promise.all(contacts.map(searchIndex.add));
  return contacts.length;
}

// Load a small sample set into an empty store so there is something to
// search. On by default for memory storage, opt-in for MongoDB.
const seed = process.env.SEED_SAMPLE || (store.kind === "memory" ? "true" : "false");
if (seed === "true" && (await store.count()) === 0) {
  const sample = JSON.parse(await readFile(new URL("../data/sample-contacts.json", import.meta.url), "utf8"));
  for (const fields of sample) await store.create(fields);
}

const indexed = await rebuildIndex();
whenRestarted(() => rebuildIndex().then(n => console.log(`trie engine restarted, re-indexed ${n} contacts`)));

app.listen(port, "0.0.0.0", () => {
  console.log(`API on :${port} - ${indexed} contacts indexed, storage: ${store.kind}`);
});
