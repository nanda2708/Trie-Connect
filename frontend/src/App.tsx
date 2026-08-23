import { useEffect, useState, type ReactNode } from "react";
import { Activity, ArrowRight, Database, Gauge, GitBranch, Search, Trash2, Upload } from "lucide-react";
import { trieApi } from "./api";
import TrieVisualizer from "./components/TrieVisualizer";
import BenchmarkPanel from "./components/BenchmarkPanel";

const sampleWords = [
  "nanda", "nandagopal", "nanda2708", "nandini", "nancy", "node", "nodejs",
  "nextjs", "network", "neural", "netflix", "naruto", "nature", "notebook",
  "react", "reactjs", "redis", "rust", "router", "runtime"
];

type Stats = { nodes: number };

export default function App() {
  const [prefix, setPrefix] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ nodes: 1 });
  const [word, setWord] = useState("");
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  async function refreshStats() {
    try {
      setStats(await trieApi.stats());
    } catch {
      // The API is unavailable until the C++ engine has been built and started.
    }
  }

  async function search(value: string) {
    setPrefix(value);
    if (!value.trim()) {
      setResults([]);
      setCount(0);
      return;
    }

    setLoading(true);
    try {
      const data = await trieApi.prefix(value, 8);
      setResults(data.words || []);
      setCount(data.count || 0);
      setMessage(`${data.count || 0} match${data.count === 1 ? "" : "es"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadSample() {
    setLoading(true);
    try {
      await trieApi.load(sampleWords);
      await refreshStats();
      setMessage(`${sampleWords.length} sample words loaded`);
      if (prefix) await search(prefix);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  async function addWord() {
    if (!word.trim()) return;
    try {
      await trieApi.insert(word.trim());
      setMessage(`Inserted “${word.trim()}”`);
      setWord("");
      await refreshStats();
      if (prefix) await search(prefix);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Insert failed");
    }
  }

  async function removeWord(value: string) {
    try {
      await trieApi.remove(value);
      setMessage(`Removed “${value}”`);
      await refreshStats();
      if (prefix) await search(prefix);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Remove failed");
    }
  }

  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#17231f]">
      <header className="border-b border-[#dfe6e1] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#194d3c] text-white"><GitBranch size={18} /></div>
            <div><div className="font-semibold tracking-tight">TrieConnect</div><div className="text-[10px] uppercase tracking-[.18em] text-[#789087]">Prefix search engine</div></div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#708079] sm:flex"><Activity size={14} /> C++ algorithm core</div>
        </div>
      </header>

      <section className="grid-bg border-b border-[#dfe6e1]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-[#39745e]">Data structures · algorithms · systems</p>
            <h1 className="text-4xl font-semibold tracking-[-.04em] md:text-6xl">Search by prefix.<br /><span className="text-[#39745e]">See the Trie work.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#64736c]">An interactive implementation of a Trie in C++, exposed through a small Express API and visualized in React. No database query is doing the prefix search for us.</p>
          </div>

          <div className="mt-10 max-w-3xl rounded-2xl border border-[#ccd8d1] bg-white p-3 shadow-[0_18px_60px_rgba(25,60,45,.08)]">
            <div className="flex items-center gap-3 px-3"><Search size={19} className="text-[#779087]" /><input autoFocus value={prefix} onChange={e => search(e.target.value)} placeholder="Try a prefix — n, nan, rea, node..." className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-[#a0aca6]" /></div>
            {prefix && <div className="mt-2 border-t border-[#edf1ee] px-3 py-4"><div className="mb-3 flex items-center justify-between text-xs text-[#728079]"><span>{loading ? "Searching..." : message}</span><span>{count} total</span></div>{results.length ? <div className="grid gap-2 sm:grid-cols-2">{results.map(item => <div key={item} className="flex items-center justify-between rounded-lg bg-[#f4f7f5] px-3 py-2.5 text-sm"><span>{item}</span><button onClick={() => removeWord(item)} title="Remove" className="text-[#9aa8a1] hover:text-red-600"><Trash2 size={14} /></button></div>)}</div> : !loading && <div className="py-5 text-sm text-[#87948e]">No words start with this prefix.</div>}</div>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6d7c75]"><span className="rounded-full border border-[#d8e2dc] bg-white px-3 py-1.5">O(L + K) prefix lookup</span><span className="rounded-full border border-[#d8e2dc] bg-white px-3 py-1.5">C++17</span><span className="rounded-full border border-[#d8e2dc] bg-white px-3 py-1.5">Express API</span><span className="rounded-full border border-[#d8e2dc] bg-white px-3 py-1.5">MongoDB persistence</span></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-10 md:grid-cols-3 md:px-8">
        <Metric icon={<Gauge size={18} />} label="Trie nodes" value={stats.nodes.toLocaleString()} detail="Allocated nodes in the C++ tree" />
        <Metric icon={<Search size={18} />} label="Current prefix" value={prefix || "—"} detail={prefix ? `${count} matching words` : "Start typing above"} />
        <Metric icon={<Database size={18} />} label="Persistence" value="MongoDB" detail="Stores words; Trie handles search" />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 md:px-8">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#39745e]">Traversal</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Follow the prefix through the tree</h2>
        </div>
        <TrieVisualizer prefix={prefix} matches={results} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
        <BenchmarkPanel />
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 md:grid-cols-[1fr_360px] md:px-8">
        <div className="rounded-2xl border border-[#dfe6e1] bg-white p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Work with the data structure</h2><p className="mt-1 text-sm text-[#74817b]">Insert a word and watch the node count change.</p></div><button onClick={loadSample} className="flex items-center gap-2 rounded-lg bg-[#194d3c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#28634f]"><Upload size={14} /> Load sample</button></div>
          <div className="mt-6 flex gap-2"><input value={word} onChange={e => setWord(e.target.value)} onKeyDown={e => e.key === "Enter" && addWord()} placeholder="Add a word" className="h-10 flex-1 rounded-lg border border-[#d7e0db] px-3 text-sm outline-none focus:border-[#39745e]" /><button onClick={addWord} className="rounded-lg border border-[#194d3c] px-4 text-sm font-semibold text-[#194d3c] hover:bg-[#edf5f0]">Insert</button></div>
        </div>
        <div className="rounded-2xl border border-[#dfe6e1] bg-[#193f34] p-6 text-white">
          <div className="flex items-center gap-2 text-[#b9dcca]"><GitBranch size={17} /><span className="text-xs font-bold uppercase tracking-[.15em]">How it works</span></div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-[#d2dfd9]"><p><b className="text-white">1.</b> Express receives the prefix.</p><p><b className="text-white">2.</b> The C++ engine walks one character at a time.</p><p><b className="text-white">3.</b> Only the matching subtree is traversed.</p><p><b className="text-white">4.</b> MongoDB persists words when configured.</p></div>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#9fc0b0]">{message}<ArrowRight size={13} /></div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#dfe6e1] bg-white p-5"><div className="flex items-center gap-2 text-[#39745e]">{icon}<span className="text-xs font-semibold uppercase tracking-[.14em] text-[#75837c]">{label}</span></div><div className="mt-4 truncate text-2xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-[#8a9690]">{detail}</div></div>;
}
