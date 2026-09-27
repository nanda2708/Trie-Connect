import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Contact, type ContactFields, type SearchInfo, type Stats, type TrieWalk } from "./api";
import BenchmarkPanel from "./components/BenchmarkPanel";
import ContactForm from "./components/ContactForm";
import ContactList from "./components/ContactList";
import TriePath from "./components/TriePath";

function formatMicros(micros: number) {
  return micros < 1000 ? `${micros.toFixed(1)} µs` : `${(micros / 1000).toFixed(2)} ms`;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState<SearchInfo | null>(null);
  const [walk, setWalk] = useState<TrieWalk | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ editing: Contact | null } | null>(null);
  const latest = useRef(0);

  const load = useCallback(async (q: string) => {
    // Responses can come back out of order while typing; keep the newest.
    const id = ++latest.current;
    try {
      const [list, path, numbers] = await Promise.all([api.contacts(q), api.walk(q), api.stats()]);
      if (id !== latest.current) return;
      setContacts(list.contacts);
      setSearch(list.search);
      setWalk(path);
      setStats(numbers);
      setError("");
    } catch (err) {
      if (id === latest.current) setError(err instanceof Error ? err.message : "can't reach the API");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(query), 120);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function save(fields: ContactFields) {
    if (form?.editing) await api.updateContact(form.editing.id, fields);
    else await api.createContact(fields);
    setForm(null);
    await load(query);
  }

  async function remove(contact: Contact) {
    if (!confirm(`Delete ${contact.name}?`)) return;
    try {
      await api.deleteContact(contact.id);
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't delete");
    }
  }

  const trimmed = query.trim();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4">
          <div>
            <h1 className="text-base font-semibold">TrieConnect</h1>
            <p className="text-xs text-stone-500">Contact search backed by a prefix tree written in C++</p>
          </div>
          {stats && (
            <p className="font-mono text-xs text-stone-500">
              {stats.trie.nodes.toLocaleString()} nodes · {stats.trie.keys.toLocaleString()} keys ·{" "}
              {stats.contacts.toLocaleString()} contacts · storage: {stats.storage}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or phone, e.g. “sa”, “rahul k”, “98765”"
              autoFocus
              className="h-12 w-full rounded-lg border border-stone-300 bg-white px-4 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            />

            <div className="mt-3 flex items-center justify-between gap-4 text-xs text-stone-500">
              <span>
                {search
                  ? `${contacts.length} ${contacts.length === 1 ? "match" : "matches"} · ${search.mode} lookup took ${formatMicros(search.micros)} in the trie`
                  : `${contacts.length} contacts`}
              </span>
              {!form && (
                <button
                  onClick={() => setForm({ editing: null })}
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-stone-700 hover:border-stone-400"
                >
                  New contact
                </button>
              )}
            </div>

            {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

            {form && (
              <div className="mt-4">
                <ContactForm
                  key={form.editing?.id ?? "new"}
                  editing={form.editing}
                  onSave={save}
                  onCancel={() => setForm(null)}
                />
              </div>
            )}

            <div className="mt-4">
              {contacts.length > 0 ? (
                <ContactList
                  contacts={contacts}
                  query={trimmed}
                  onEdit={contact => setForm({ editing: contact })}
                  onDelete={remove}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500">
                  {trimmed ? "Nobody matches that prefix." : "No contacts yet."}
                </p>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold">Path through the trie</h2>
            <div className="mt-3">
              <TriePath walk={walk} />
            </div>
          </aside>
        </div>

        <div className="mt-14 border-t border-stone-200 pt-8">
          <BenchmarkPanel />
        </div>
      </main>
    </div>
  );
}
