import { useEffect, useState, type FormEvent } from "react";
import { Activity, Database, GitBranch, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound, X } from "lucide-react";
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

  useEffect(() => { refresh(""); }, []);
  useEffect(() => {
    const timer = setTimeout(() => refresh(query), 220);
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
    if (!form.name.trim() || !form.phone.trim()) {
      setMessage("Name and phone number are required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await contactApi.update(editingId, form);
        setMessage(`Updated ${form.name}`);
      } else {
        await contactApi.create(form);
        setMessage(`Added ${form.name}`);
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
    setMessage(`Running ${size.toLocaleString()} record benchmark...`);
    try {
      const result = await trieApi.benchmark(size);
      setBenchmarks(current => [...current.filter(item => item.size !== size), result].sort((a, b) => a.size - b.size));
      setMessage(`${size.toLocaleString()} records benchmark complete`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benchmark failed");
    } finally {
      setRunningBenchmark(null);
    }
  }

  const searchMode = !query.trim() ? "All contacts" : /^[+0-9]/.test(query.trim()) ? "MongoDB phone search" : "C++ Trie name-prefix search";

  return (
    <main className="min-h-screen bg-[#f6f8f6] text-[#17231f]">
      <header className="border-b border-[#dce5df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#194d3c] text-white"><GitBranch size={19} /></div>
            <div><div className="font-semibold tracking-tight">TrieConnect</div><div className="text-[10px] uppercase tracking-[.18em] text-[#718078]">Trie-powered contact book</div></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-[#edf5f0] px-3 py-1.5 text-xs font-medium text-[#39745e] sm:flex"><Database size={14} /> MongoDB persistence</div>
        </div>
      </header>

      <section className="border-b border-[#dce5df] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#39745e]">Data structures + systems</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] md:text-5xl">Contacts indexed by a C++ Trie.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#66746d]">Name lookup uses the Trie for prefix matching. Phone, email and notes stay in MongoDB, which stores the complete contact record.</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-[#dce5df] bg-[#f8faf8] p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? "Edit contact" : "Add contact"}</h2>{editingId && <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-[#718078] hover:text-[#17231f]"><X size={14}/> Cancel</button>}</div>
              <form onSubmit={saveContact} className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={form.name} onChange={v => change("name", v)} placeholder="e.g. Sai Nanda Gopal" required />
                <Field label="Phone" value={form.phone} onChange={v => change("phone", v)} placeholder="e.g. +91 98765 43210" required />
                <Field label="Email" value={form.email} onChange={v => change("email", v)} placeholder="name@example.com" />
                <Field label="Notes" value={form.notes} onChange={v => change("notes", v)} placeholder="College, work, etc." />
                <button disabled={saving} className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#194d3c] text-sm font-semibold text-white hover:bg-[#28634f] disabled:opacity-60 sm:col-span-2"><Plus size={16}/>{saving ? "Saving..." : editingId ? "Save changes" : "Add contact"}</button>
              </form>
            </div>

            <div className="rounded-2xl bg-[#193f34] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#b9dcca]">Live Trie status</p>
              <div className="mt-5 text-4xl font-semibold">{nodes.toLocaleString()}</div>
              <p className="mt-1 text-sm text-[#b8ccc3]">nodes allocated for contact names</p>
              <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-xs text-[#d3e1db]"><p><b className="text-white">Name:</b> prefix walk + subtree traversal in C++.</p><p><b className="text-white">Other fields:</b> MongoDB queries and indexes.</p><p><b className="text-white">Persistence:</b> saved names hydrate the Trie on startup.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#39745e]">Contact lookup</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{contacts.length} {contacts.length === 1 ? "contact" : "contacts"}</h2></div>
          <div className="w-full sm:w-96"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-[#83918a]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name prefix or phone number..." className="h-11 w-full rounded-xl border border-[#d5dfd9] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#39745e]"/></div><p className="mt-1.5 text-[11px] text-[#718078]">{searchMode}</p></div>
        </div>

        <div className="mt-5 grid gap-3">
          {contacts.map(contact => <ContactCard key={contact.id} contact={contact} onEdit={() => startEdit(contact)} onDelete={() => remove(contact)} />)}
          {!contacts.length && <div className="rounded-2xl border border-dashed border-[#cbd8d0] bg-white px-6 py-14 text-center"><UserRound className="mx-auto text-[#8b9992]" size={30}/><h3 className="mt-3 font-semibold">{query ? "No matching contacts" : "No contacts yet"}</h3><p className="mt-1 text-sm text-[#7b8982]">{query ? "Try another name prefix or phone number." : "Add your first contact above."}</p></div>}
        </div>
        <p className="mt-5 text-xs text-[#7b8982]">{message}</p>
      </section>

      <section className="border-t border-[#dce5df] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
          <div className="flex items-start justify-between gap-5">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#39745e]">Performance lab</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Trie vs linear prefix lookup</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66746d]">Run the same prefix query against 10K, 1 lakh and 10 lakh generated records. The C++ benchmark reports median lookup time over five runs.</p></div>
            <Activity className="hidden text-[#39745e] sm:block" size={26}/>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {benchmarkSizes.map(size => <button key={size} disabled={runningBenchmark !== null} onClick={() => runBenchmark(size)} className="rounded-xl border border-[#d5dfd9] bg-[#f8faf8] px-4 py-4 text-left hover:border-[#39745e] disabled:cursor-wait disabled:opacity-60"><div className="text-xs uppercase tracking-[.14em] text-[#718078]">Dataset</div><div className="mt-1 text-lg font-semibold">{size >= 1_000_000 ? "10 lakh" : size === 100_000 ? "1 lakh" : "10,000"} records</div><div className="mt-1 text-xs text-[#718078]">{runningBenchmark === size ? "Running benchmark..." : "Click to benchmark"}</div></button>)}
          </div>

          {benchmarks.length > 0 && <div className="mt-6 overflow-x-auto rounded-xl border border-[#dce5df]"><table className="w-full min-w-[650px] text-sm"><thead className="bg-[#f5f8f5] text-left text-xs uppercase tracking-[.12em] text-[#718078]"><tr><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Linear</th><th className="px-4 py-3">Trie</th><th className="px-4 py-3">Speedup</th><th className="px-4 py-3">Matches</th></tr></thead><tbody>{benchmarks.map(result => { const speedup = result.trieMs > 0 ? result.linearMs / result.trieMs : 0; return <tr key={result.size} className="border-t border-[#e6ece8]"><td className="px-4 py-3 font-medium">{result.size.toLocaleString()}</td><td className="px-4 py-3">{result.linearMs.toFixed(4)} ms</td><td className="px-4 py-3 font-semibold text-[#28634f]">{result.trieMs.toFixed(4)} ms</td><td className="px-4 py-3">{speedup.toFixed(2)}×</td><td className="px-4 py-3">{result.trieMatches}</td></tr>; })}</tbody></table></div>}
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#64736c]">{label}{required && " *"}</span><input required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-[#d5dfd9] bg-white px-3 text-sm outline-none focus:border-[#39745e]" /></label>;
}

function ContactCard({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }) {
  return <article className="rounded-2xl border border-[#dce5df] bg-white p-5 shadow-[0_8px_30px_rgba(25,60,45,.04)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8f1eb] font-semibold text-[#28634f]">{contact.name.charAt(0).toUpperCase()}</div><div><h3 className="font-semibold">{contact.name}</h3><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#718078]"><span className="inline-flex items-center gap-1"><Phone size={12}/>{contact.phone}</span>{contact.email && <span className="inline-flex items-center gap-1"><Mail size={12}/>{contact.email}</span>}</div></div></div>{contact.notes && <p className="mt-3 pl-[52px] text-sm text-[#64736c]">{contact.notes}</p>}</div><div className="flex gap-2 self-end sm:self-center"><button onClick={onEdit} title="Edit contact" className="grid h-9 w-9 place-items-center rounded-lg border border-[#d5dfd9] text-[#52635b] hover:bg-[#f2f6f3]"><Pencil size={15}/></button><button onClick={onDelete} title="Delete contact" className="grid h-9 w-9 place-items-center rounded-lg border border-[#ead8d8] text-[#a35454] hover:bg-[#fff4f4]"><Trash2 size={15}/></button></div></div></article>;
}
