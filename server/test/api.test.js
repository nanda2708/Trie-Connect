// Starts the real API (memory storage, real C++ engine) and drives it over HTTP.
// Needs the engine built first: npm run build:cpp

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 5900 + Math.floor(Math.random() * 90);
const base = `http://localhost:${port}/api`;
let server;

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

const names = async q => (await call("GET", `/contacts?q=${encodeURIComponent(q)}`)).body.contacts.map(c => c.name);

before(async () => {
  server = spawn("node", ["src/index.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), MONGODB_URI: "", SEED_SAMPLE: "false" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", chunk => String(chunk).includes("API on") && resolve());
    server.on("exit", code => reject(new Error(`server exited with ${code}`)));
  });
});

after(() => server?.kill());

test("add, search, rename and delete a contact", async () => {
  const created = await call("POST", "/contacts", { name: "Priya Sharma", phone: "9876543210" });
  assert.equal(created.status, 201);
  const { id } = created.body;

  assert.deepEqual(await names("pri"), ["Priya Sharma"]);
  assert.deepEqual(await names("sh"), ["Priya Sharma"]);
  assert.deepEqual(await names("98765"), ["Priya Sharma"]);
  assert.deepEqual(await names("priya x"), []);

  await call("PUT", `/contacts/${id}`, { name: "Priya Nair" });
  assert.deepEqual(await names("sharma"), [], "old name keys are removed");
  assert.deepEqual(await names("nair"), ["Priya Nair"]);

  assert.equal((await call("DELETE", `/contacts/${id}`)).status, 204);
  assert.deepEqual(await names("priya"), []);
  assert.deepEqual(await names("98765"), []);

  const { trie } = (await call("GET", "/stats")).body;
  assert.equal(trie.entries, 0);
  assert.equal(trie.nodes, 1, "every node is pruned once the index is empty");
});

test("each query word needs its own name word", async () => {
  await call("POST", "/contacts", { name: "Rahul Kumar", phone: "9000000001" });
  await call("POST", "/contacts", { name: "Rahul Rao", phone: "9000000002" });
  await call("POST", "/contacts", { name: "Ravi Rahul", phone: "9000000003" });

  assert.deepEqual(await names("rahul"), ["Rahul Kumar", "Rahul Rao", "Ravi Rahul"]);
  assert.deepEqual((await names("rahul r")).sort(), ["Rahul Rao", "Ravi Rahul"]);
  assert.deepEqual(await names("ra k"), ["Rahul Kumar"]);
});

test("rejects bad input", async () => {
  assert.equal((await call("POST", "/contacts", { name: "A", phone: "12345" })).status, 400);
  assert.equal((await call("POST", "/contacts", { name: "!!", phone: "9111111111" })).status, 400);
  await call("POST", "/contacts", { name: "Dup", phone: "9111111111" });
  assert.equal((await call("POST", "/contacts", { name: "Dup Two", phone: "9111111111" })).status, 409);
  assert.equal((await call("DELETE", "/contacts/does-not-exist")).status, 404);
});

test("walk reports where a prefix leaves the trie", async () => {
  await call("POST", "/contacts", { name: "Sam", phone: "9222222222" });
  const walk = (await call("GET", "/trie/walk?q=sax")).body;
  assert.equal(walk.prefix, "sax");
  assert.deepEqual(walk.steps.map(s => s.ch), ["", "s", "a"]);
  assert.deepEqual(walk.completions, []);
});

test("benchmark returns matching counts from both methods", async () => {
  const r = (await call("GET", "/benchmark?size=10000&prefix=word999")).body;
  assert.equal(r.trieMatches, 11);
  assert.equal(r.linearMatches, 11);
});
