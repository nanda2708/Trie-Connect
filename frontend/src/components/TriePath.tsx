import type { TrieWalk } from "../api";

// Draws the nodes the search walked through. Each row is one trie node: the
// character on the edge into it, how many entries sit below it, and the
// edges leaving it (the one the prefix takes next is highlighted).
export default function TriePath({ walk }: { walk: TrieWalk | null }) {
  if (!walk) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  const { steps, prefix, completions, mode } = walk;
  const matched = steps.length - 1;
  const missing = prefix.slice(matched);

  return (
    <div>
      <p className="text-xs text-stone-500">
        {mode === "phone" ? "Phone" : "Name"} index
        {prefix ? <> · walking <code className="font-mono text-stone-800">{prefix}</code></> : " · type to walk it"}
      </p>

      <ol className="mt-4 space-y-0">
        {steps.map((step, depth) => {
          const nextChar = prefix[depth];
          return (
            <li key={depth} className="relative flex gap-3 pb-4 last:pb-0">
              {depth < steps.length - 1 || missing ? (
                <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-stone-300" />
              ) : null}
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-sm ${
                  depth === 0 ? "border-stone-300 bg-stone-100 text-stone-500" : "border-emerald-700 bg-emerald-50 text-emerald-900"
                }`}
              >
                {depth === 0 ? "·" : step.ch}
              </span>
              <div className="min-w-0 pt-1">
                <div className="text-sm">
                  <span className="font-mono text-stone-800">{depth === 0 ? "root" : prefix.slice(0, depth)}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {step.count} {step.count === 1 ? "entry" : "entries"} below
                  </span>
                </div>
                {step.next && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[...step.next].map(ch => (
                      <span
                        key={ch}
                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
                          ch === nextChar ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}

        {missing && (
          <li className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-red-300 font-mono text-sm text-red-500">
              {missing[0]}
            </span>
            <p className="pt-1.5 text-sm text-stone-600">
              No edge for <code className="font-mono">{missing[0]}</code>. The search stops here after {matched}{" "}
              {matched === 1 ? "step" : "steps"}, without scanning anything else.
            </p>
          </li>
        )}
      </ol>

      {completions.length > 0 && (
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs text-stone-500">Keys under this node</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {completions.map(key => (
              <span key={key} className="rounded-full bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-700">
                <b className="font-semibold text-emerald-800">{key.slice(0, prefix.length)}</b>
                {key.slice(prefix.length)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
