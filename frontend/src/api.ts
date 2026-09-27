const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `request failed (${response.status})`);
  return data;
}

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export type ContactFields = Omit<Contact, "id">;

export type SearchInfo = { mode: "name" | "phone"; micros: number };

export type TrieStep = { ch: string; count: number; next: string };

export type TrieWalk = {
  mode: "name" | "phone";
  prefix: string;
  steps: TrieStep[];
  completions: string[];
};

export type Stats = {
  trie: { nodes: number; keys: number; entries: number };
  contacts: number;
  storage: "mongodb" | "memory";
};

export type BenchmarkResult = {
  size: number;
  prefix: string;
  linearMs: number;
  trieMs: number;
  buildMs: number;
  nodes: number;
  linearMatches: number;
  trieMatches: number;
};

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  contacts: (q: string) =>
    request<{ contacts: Contact[]; search: SearchInfo | null }>(`/contacts?q=${encodeURIComponent(q)}`),
  createContact: (fields: ContactFields) =>
    request<Contact>("/contacts", { method: "POST", body: json(fields) }),
  updateContact: (id: string, fields: ContactFields) =>
    request<Contact>(`/contacts/${id}`, { method: "PUT", body: json(fields) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: "DELETE" }),
  walk: (q: string) => request<TrieWalk>(`/trie/walk?q=${encodeURIComponent(q)}`),
  stats: () => request<Stats>("/stats"),
  benchmark: (size: number, prefix: string) =>
    request<BenchmarkResult>(`/benchmark?size=${size}&prefix=${encodeURIComponent(prefix)}`),
};
