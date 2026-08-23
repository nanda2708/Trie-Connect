const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const trieApi = {
  prefix: (prefix: string, limit = 8) => request(`/trie/prefix?prefix=${encodeURIComponent(prefix)}&limit=${limit}`),
  search: (word: string) => request(`/trie/search?word=${encodeURIComponent(word)}`),
  stats: () => request("/trie/stats"),
  insert: (word: string) => request("/trie/insert", { method: "POST", body: JSON.stringify({ word }) }),
  remove: (word: string) => request(`/trie/${encodeURIComponent(word)}`, { method: "DELETE" }),
  load: (words: string[]) => request("/trie/load", { method: "POST", body: JSON.stringify({ words }) }),
  benchmark: (size: number, prefix: string) => request(`/benchmark?size=${size}&prefix=${encodeURIComponent(prefix)}`)
};
