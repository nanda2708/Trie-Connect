// Maps contacts onto trie keys and runs searches against them.
//
// Each contact is stored under one key per word of its name plus one key for
// its phone number, all pointing at the contact id:
//
//   "Priya Sharma", 9876543210, id c7  ->  n:priya -> c7
//                                          n:sharma -> c7
//                                          p:9876543210 -> c7
//
// The n: / p: namespaces keep name and phone lookups apart inside one trie.

import { send } from "./engine.js";

const NAME = "n:";
const PHONE = "p:";

export function tokenize(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // "José" -> "Jose"
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function keysFor(contact) {
  const names = new Set(tokenize(contact.name).map(token => NAME + token));
  return [...names, PHONE + contact.phone];
}

export async function add(contact) {
  await Promise.all(keysFor(contact).map(key => send("add", key, contact.id)));
}

export async function remove(contact) {
  await Promise.all(keysFor(contact).map(key => send("remove", key, contact.id)));
}

export async function replace(before, after) {
  const oldKeys = new Set(keysFor(before));
  const newKeys = new Set(keysFor(after));
  await Promise.all([
    ...[...oldKeys].filter(k => !newKeys.has(k)).map(k => send("remove", k, before.id)),
    ...[...newKeys].filter(k => !oldKeys.has(k)).map(k => send("add", k, after.id)),
  ]);
}

// Turns what the user typed into the trie prefixes to look up.
function parse(query) {
  const text = String(query).trim();
  if (/^\+?\d/.test(text)) {
    const digits = text.replace(/\D/g, "");
    return { mode: "phone", prefixes: digits ? [PHONE + digits] : [] };
  }
  return { mode: "name", prefixes: tokenize(text).map(token => NAME + token) };
}

// "ra sh" finds contacts with a word starting "ra" AND a word starting "sh".
// Each word is its own trie lookup; the id lists are intersected here.
export async function search(query, limit = 50) {
  const { mode, prefixes } = parse(query);
  if (!prefixes.length) return { mode, ids: [], micros: 0 };

  const perWordLimit = prefixes.length > 1 ? 1000 : limit;
  const results = await Promise.all(prefixes.map(p => send("find", p, perWordLimit)));

  let ids = results[0].ids;
  for (const { ids: other } of results.slice(1)) {
    const keep = new Set(other);
    ids = ids.filter(id => keep.has(id));
  }

  const micros = results.reduce((sum, r) => sum + r.micros, 0);
  return { mode, ids: ids.slice(0, limit), micros };
}

// The trie lookups can let two query words land on the same name word
// ("rahul r" matching "Rahul Kumar" through "rahul"). Check that each query
// word has a name word of its own; longest first so "sa sai" works out.
export function wordsMatch(name, query) {
  const words = tokenize(name);
  const wanted = tokenize(query).sort((a, b) => b.length - a.length);
  return wanted.every(prefix => {
    const i = words.findIndex(word => word.startsWith(prefix));
    if (i === -1) return false;
    words.splice(i, 1);
    return true;
  });
}

// The path the last word of the query takes through the trie, for the UI.
// Namespace nodes (root -> "n" -> ":") are hidden; the ":" node is shown as
// the root of that index.
export async function walk(query) {
  const { mode, prefixes } = parse(query);
  const space = mode === "phone" ? PHONE : NAME;
  const prefix = prefixes.at(-1) ?? space;

  const [{ steps }, { keys }] = await Promise.all([
    send("walk", prefix),
    send("complete", prefix, 8),
  ]);

  const visible = steps.slice(space.length);
  if (visible.length) visible[0] = { ...visible[0], ch: "" };

  return {
    mode,
    prefix: prefix.slice(space.length),
    steps: visible,
    completions: keys.map(key => key.slice(space.length)),
  };
}
