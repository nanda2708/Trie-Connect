import { useEffect, useState, type FormEvent } from "react";
import { Database, Pencil, Phone, Plus, Search, Trash2, UserRound, X, Zap } from "lucide-react";
import { contactApi, trieApi, type BenchmarkResult, type Contact } from "./api";

type Form = Omit<Contact, "id">;
const emptyForm: Form = { name: "", phone: "", email: "", notes: "" };
const benchmarkSizes = [10_000, 100_000, 1_000_000];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nodes, setNodes] = useState(1);
  const [message, setMessage] = useState("Ready");
  const [saving, setSaving] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState<number | null>(null);

  async function refresh(value = query) {
    try {
      const [items, stats] = await Promise.all([contactApi.list(value), trieApi.stats()]);
      setContacts(items);
      setNodes(stats.nodes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load contacts");
    }
  }

  useEffect(() => { void refresh(""); }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  function change(key: keyof Form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setForm({ name: contact.name, phone: contact.phone, email: contact.email, notes: contact.notes });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveContact(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      setMessage("Please enter a name.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setMessage("Phone number must contain exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, name, phone };
      if (editingId) {
        await contactApi.update(editingId, payload);
        setMessage(`Updated ${name}`);
      } else {
        await contactApi.create(payload);
        setMessage(`Added ${name}`);
      }
      cancelEdit();
      await refresh(query);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save contact");
    } finally {
      setSaving(false);
    }
  }

  async function remove(contact: Contact) {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    try {
      await contactApi.remove(contact.id);
      setMessage(`Deleted ${contact.name}`);
      if (editingId === contact.id) cancelEdit();
      await refresh(query);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete contact");
    }
  }

  async function runBenchmark(size: number) {
    setRunningBenchmark(size);
    setMessage(`Running ${size.toLocaleString()} records...`);
    try {
      const result = await trieApi.benchmark(size);
      setBenchmarks(current => [...current.filter(item => item.size !== size), result].sort((a, b) => a.size - b.size));
      setMessage(`${size.toLocaleString()} record benchmark complete`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setRunningBenchmark(null);
    }
  }

  const trimmedQuery = query.trim();
  const searchingPhone = /^\d/.test(trimmedQuery);
  const searchMode = !trimmedQuery ? "Showing all contacts" : searchingPhone ? "Searching phone numbers with the C++ Trie" : "Searching names with the C++ Trie";

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-[#17211d]">
      <header className="border-b border-[#dfe5e2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#1f4d3b] text-white"><span className="text-sm font-bold">T</span></div>
            <div><div className="text-[15px] font-semibold tracking-tight">TrieConnect</div><div className="text-[11px] text-[#78837e]">Contacts, indexed properly.</div></div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#68746f] sm:flex"><Database size={14} /> MongoDB</div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:py-10">
        <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-[#dfe5e2] bg-white p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><h1 className="text-xl font-semibold">{editingId ? "Edit contact" : "Add a contact"}</h1><p className="mt-1 text-sm text-[#737e79]">Keep the details you actually need.</p></div>
              {editingId && <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1.5 text-sm text-[#69756f] hover:text-[#17211d]"><X size={15} /> Cancel</button>}
            </div>

            <form onSubmit={saveContact} className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={v => change("name", v)} placeholder="Sai Nanda Gopal" required autoComplete="name" />
              <Field label="Phone number" value={form.phone} onChange={v => change("phone", v.replace(/\D/g, "").slice(0, 10))} placeholder="9999999999" required inputMode="numeric" maxLength={10} autoComplete="tel" hint="10 digits" />
              <Field label="Email" value={form.email} onChange={v => change("email", v)} placeholder="name@example.com" inputMode="email" autoComplete="email" />
              <Field label="Notes" value={form.notes} onChange={v => change("notes", v)} placeholder="College, work, family..." />
              <button disabled={saving} className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1f4d3b] px-4 text-sm font-medium text-white transition hover:bg-[#183d30] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"><Plus size={16} /> {saving ? "Saving..." : editingId ? "Save changes" : "Add contact"}</button>
            </form>
          </div>

          <aside className="rounded-xl border border-[#dfe5e2] bg-[#1f4d3b] p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-medium"><Zap size={15} /> Trie index</div>
            <div className="mt-6 text-3xl font-semibold">{nodes.toLocaleString()}</div>
            <p className="mt-1 text-sm text-[#c9d9d1]">nodes currently in memory</p>
            <div className="mt-6 border-t border-white/15 pt-4 text-xs leading-5 text-[#d7e2dd]"><p><b className="text-white">Name</b> — prefix lookup</p><p><b className="text-white">Phone</b> — digit-prefix lookup</p><p><b className="text-white">MongoDB</b> — stores contact details</p></div>
          </aside>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 border-b border-[#dfe5e2] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-semibold">Contacts <span className="font-normal text-[#8a948f]">{contacts.length}</span></h2><p className="mt-1 text-xs text-[#7a8580]">{searchMode}</p></div>
            <div className="relative w-full sm:w-80"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[#8a948f]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or phone" className="h-10 w-full rounded-lg border border-[#d5ddd9] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6a8e7d] focus:ring-2 focus:ring-[#dce9e3]" /></div>
          </div>

          <div className="mt-4 divide-y divide-[#e4e9e6] overflow-hidden rounded-xl border border-[#dfe5e2] bg-white">
            {contacts.map(contact => <ContactRow key={contact.id} contact={contact} onEdit={() => startEdit(contact)} onDelete={() => remove(contact)} />)}
            {!contacts.length && <div className="px-6 py-14 text-center"><UserRound className="mx-auto text-[#a0aaa5]" size={28} /><h3 className="mt-3 text-sm font-medium">{query ? "No contacts found" : "Your contact list is empty"}</h3><p className="mt-1 text-xs text-[#858f8a]">{query ? "Try a different name or phone prefix." : "Add a contact above to get started."}</p></div>}
          </div>
          <p className="mt-3 min-h-4 text-xs text-[#74807a]">{message}</p>
        </section>

        <section className="mt-12 border-t border-[#dfe5e2] pt-8">
          <div><h2 className="text-lg font-semibold">Performance</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#737e79]">The same prefix lookup is tested with 10K, 1 lakh and 10 lakh generated records. Results come from the C++ benchmark.</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {benchmarkSizes.map(size => <button key={size} disabled={runningBenchmark !== null} onClick={() => void runBenchmark(size)} className="rounded-lg border border-[#dfe5e2] bg-white p-4 text-left transition hover:border-[#7b9b8c] hover:shadow-sm disabled:cursor-wait disabled:opacity-60"><div className="text-xs text-[#7b8580]">Dataset</div><div className="mt-1 font-semibold">{size === 1_000_000 ? "10 lakh" : size === 100_000 ? "1 lakh" : "10,000"} records</div><div className="mt-1 text-xs text-[#7b8580]">{runningBenchmark === size ? "Running..." : "Run benchmark"}</div></button>)}
          </div>
          {benchmarks.length > 0 && <div className="mt-4 overflow-x-auto rounded-lg border border-[#dfe5e2] bg-white"><table className="w-full min-w-[620px] text-sm"><thead className="bg-[#f7f8f7] text-left text-xs text-[#707b76]"><tr><th className="px-4 py-3 font-medium">Records</th><th className="px-4 py-3 font-medium">Linear</th><th className="px-4 py-3 font-medium">Trie</th><th className="px-4 py-3 font-medium">Speedup</th><th className="px-4 py-3 font-medium">Matches</th></tr></thead><tbody>{benchmarks.map(result => { const speedup = result.trieMs > 0 ? result.linearMs / result.trieMs : 0; return <tr key={result.size} className="border-t border-[#e8ecea]"><td className="px-4 py-3 font-medium">{result.size.toLocaleString()}</td><td className="px-4 py-3">{result.linearMs.toFixed(4)} ms</td><td className="px-4 py-3 font-medium text-[#2d6a52]">{result.trieMs.toFixed(4)} ms</td><td className="px-4 py-3">{speedup.toFixed(2)}×</td><td className="px-4 py-3">{result.trieMatches}</td></tr>; })}</tbody></table></div>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, required, inputMode, maxLength, autoComplete, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; inputMode?: "text" | "numeric" | "email" | "tel"; maxLength?: number; autoComplete?: string; hint?: string }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#59665f]"><span>{label}{required && " *"}</span>{hint && <span className="font-normal text-[#8a948f]">{hint}</span>}</span><input required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} autoComplete={autoComplete} className="h-10 w-full rounded-lg border border-[#d5ddd9] bg-white px-3 text-sm outline-none transition placeholder:text-[#a0a8a4] focus:border-[#6a8e7d] focus:ring-2 focus:ring-[#dce9e3]" /></label>;
}

function ContactRow({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }) {
  return <article className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e9f0ec] text-sm font-semibold text-[#2d6a52]">{contact.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><h3 className="truncate text-sm font-medium">{contact.name}</h3><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#727d78]"><span className="inline-flex items-center gap-1"><Phone size={12} /> {contact.phone}</span>{contact.email && <span className="truncate">{contact.email}</span>}</div>{contact.notes && <p className="mt-1 truncate text-xs text-[#8a948f]">{contact.notes}</p>}</div></div><div className="flex gap-1 self-end sm:self-center"><button type="button" onClick={onEdit} aria-label={`Edit ${contact.name}`} className="grid h-8 w-8 place-items-center rounded-md text-[#65716b] hover:bg-[#f1f4f2] hover:text-[#1f4d3b]"><Pencil size={15} /></button><button type="button" onClick={onDelete} aria-label={`Delete ${contact.name}`} className="grid h-8 w-8 place-items-center rounded-md text-[#9b6262] hover:bg-[#faf0f0]"><Trash2 size={15} /></button></div></article>;
}
