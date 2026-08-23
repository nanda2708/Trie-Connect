import { useState } from "react";

const samples = [
  { size: "1K", linear: 0.18, trie: 0.02 },
  { size: "10K", linear: 1.7, trie: 0.03 },
  { size: "100K", linear: 16.4, trie: 0.04 },
  { size: "1M", linear: 164.2, trie: 0.05 },
];

export default function BenchmarkPanel() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = () => {
    setRunning(true);
    setDone(false);
    window.setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 700);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Trie vs linear search</h2>
          <p className="mt-1 text-sm text-slate-400">A simple view of how prefix lookup scales with the dataset.</p>
        </div>
        <button onClick={run} disabled={running} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
          {running ? "Running…" : "Run benchmark"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {samples.map((sample) => {
          const width = Math.min((sample.linear / 165) * 100, 100);
          return (
            <div key={sample.size}>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>{sample.size} records</span>
                <span>Trie {sample.trie} ms · Linear {sample.linear} ms</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-slate-500" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {done && <p className="mt-4 text-xs text-emerald-400">Benchmark completed. Replace the sample values with live measurements from the C++ engine when running a dataset.</p>}
    </section>
  );
}
