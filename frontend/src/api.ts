const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export const contactApi = {
  list: (q = "") => request(`/contacts?q=${encodeURIComponent(q)}`) as Promise<Contact[]>,
  create: (contact: Omit<Contact, "id">) => request("/contacts", { method: "POST", body: JSON.stringify(contact) }) as Promise<Contact>,
  update: (id: string, contact: Partial<Omit<Contact, "id">>) => request(`/contacts/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(contact) }) as Promise<Contact>,
  remove: (id: string) => request(`/contacts/${encodeURIComponent(id)}`, { method: "DELETE" })
};

export const trieApi = {
  prefix: (prefix: string, limit = 8) => request(`/trie/prefix?prefix=${encodeURIComponent(prefix)}&limit=${limit}`),
  search: (word: string) => request(`/trie/search?word=${encodeURIComponent(word)}`),
  stats: () => request("/trie/stats"),
  insert: (word: string) => request("/trie/insert", { method: "POST", body: JSON.stringify({ word }) }),
  remove: (word: string) => request(`/trie/${encodeURIComponent(word)}`, { method: "DELETE" }),
  benchmark: (size: number, prefix: string) => request(`/benchmark?size=${size}&prefix=${encodeURIComponent(prefix)}`)
};
