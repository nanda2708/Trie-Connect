import { useState } from "react";
import { trieApi } from "../api";

type Result = {
  size: number;
  prefix: string;
  linearMs: number;
  trieMs: number;
  linearMatches: number;
  trieMatches: number;
};

const sizes = [1000, 10000, 100000, 1000000];

export default function BenchmarkPanel() {
  const [prefix, setPrefix] = useState("word999");
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function runBenchmark() {
    const value = prefix.trim() || "word999";
    setRunning(true);
    setError("");
    setResults([]);

    try {
      const next: Result[] = [];
      for (const size of sizes) {
        next.push(await trieApi.benchmark(size, value));
        setResults([...next]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark failed");
    } finally {
      setRunning(false);
    }
  }

  const maxTime = Math.max(...results.map(item => item.linearMs), 1);

  return (
    <section className="rounded-2xl border border-[#dfe6e1] bg-white p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#39745e]">Live benchmark</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Trie vs linear prefix search</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#74817b]">Both methods search the same generated dataset. Only the lookup phase is timed, and the values below come from the C++ engine at request time.</p>
        </div>
        <div className="flex gap-2">
          <input value={prefix} onChange={e => setPrefix(e.target.value)} className="h-10 w-32 rounded-lg border border-[#d7e0db] px-3 text-sm outline-none focus:border-[#39745e]" aria-label="Benchmark prefix" />
          <button onClick={runBenchmark} disabled={running} className="rounded-lg bg-[#194d3c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-7 space-y-5">
        {results.map(result => (
          <div key={result.size}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#697770]">
              <span className="font-semibold">{result.size.toLocaleString()} records</span>
              <span>Trie {result.trieMs.toFixed(3)} ms · Linear {result.linearMs.toFixed(3)} ms · {result.trieMatches} match{result.trieMatches === 1 ? "" : "es"}</span>
            </div>
            <div className="grid gap-2">
              <Bar label="Trie" value={result.trieMs} max={maxTime} />
              <Bar label="Linear" value={result.linearMs} max={maxTime} />
            </div>
          </div>
        ))}
      </div>

      {!results.length && !running && !error && (
        <div className="mt-7 rounded-xl border border-dashed border-[#d6e0da] p-8 text-center text-sm text-[#87948e]">Run the benchmark to measure the real C++ implementation.</div>
      )}
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max((value / max) * 100, value > 0 ? 1 : 0);
  return (
    <div className="grid grid-cols-[70px_1fr_70px] items-center gap-3 text-xs">
      <span className="text-[#75837c]">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf1ee]"><div className="h-full rounded-full bg-[#39745e]" style={{ width: `${width}%` }} /></div>
      <span className="text-right font-medium">{value.toFixed(3)} ms</span>
    </div>
  );
}
