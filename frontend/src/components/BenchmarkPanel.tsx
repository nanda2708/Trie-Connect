import { useState, type FormEvent } from "react";
import { api, type BenchmarkResult } from "../api";

const SIZES = [10_000, 100_000, 1_000_000];

function ms(value: number) {
  if (value < 0.01) return `${(value * 1000).toFixed(1)} µs`;
  return `${value.toFixed(value < 1 ? 3 : 1)} ms`;
}

export default function BenchmarkPanel() {
  const [prefix, setPrefix] = useState("word999");
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError("");
    setResults([]);
    try {
      // One at a time: the 1M run allocates a million-node trie and the
      // engine handles requests in order anyway.
      for (const size of SIZES) {
        const result = await api.benchmark(size, prefix.trim() || "word999");
        setResults(current => [...current, result]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "benchmark failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">Trie vs. scanning a list</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            The engine generates <code className="font-mono text-xs">word0 … wordN</code>, loads it into a fresh trie,
            then finds every word starting with the prefix two ways: walking the trie, and checking each word in a
            vector. Times are the median of 7 runs, measured in C++ on the server.
          </p>
        </div>
        <form onSubmit={run} className="flex gap-2">
          <input
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            aria-label="Prefix to benchmark"
            className="h-9 w-28 rounded-md border border-stone-300 bg-white px-2.5 font-mono text-sm outline-none focus:border-emerald-700"
          />
          <button
            disabled={running}
            className="h-9 rounded-md bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {running ? "Running…" : "Run"}
          </button>
        </form>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {results.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Words</th>
                <th className="px-4 py-2.5 font-medium">Matches</th>
                <th className="px-4 py-2.5 font-medium">Linear scan</th>
                <th className="px-4 py-2.5 font-medium">Trie lookup</th>
                <th className="px-4 py-2.5 font-medium">Faster by</th>
                <th className="px-4 py-2.5 font-medium">Build (nodes)</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.size} className="border-t border-stone-100">
                  <td className="px-4 py-2.5 tabular-nums">{r.size.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.trieMatches.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums">{ms(r.linearMs)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-emerald-800">{ms(r.trieMs)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.trieMs > 0 ? `${Math.round(r.linearMs / r.trieMs)}×` : "-"}</td>
                  <td className="px-4 py-2.5 tabular-nums text-stone-500">
                    {ms(r.buildMs)} ({r.nodes.toLocaleString()})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-stone-500">
        The scan's cost grows with the number of words. The trie's grows with the prefix length plus the number of
        matches, so it only slows down when there are more results to return. Building the trie isn't free,
        which is why it's shown separately. It pays off when you search the same data many times.
      </p>
    </section>
  );
}
