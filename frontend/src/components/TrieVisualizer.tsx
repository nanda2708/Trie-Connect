type Props = {
  prefix: string;
  matches: string[];
};

function Node({ label, active = false, children }: { label: string; active?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold ${active ? "border-cyan-400 bg-cyan-400/15 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
        {label}
      </div>
      {children && <div className="mt-3 flex gap-6">{children}</div>}
    </div>
  );
}

export default function TrieVisualizer({ prefix, matches }: Props) {
  const letters = [...prefix.toLowerCase()].slice(0, 8);

  if (!letters.length) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/50 text-sm text-slate-500">
        Type a prefix to see the traversal.
      </div>
    );
  }

  let tree: React.ReactNode = <Node label="root" />;
  for (let i = letters.length - 1; i >= 0; i -= 1) {
    tree = <Node label={letters[i]} active>{tree}</Node>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 p-8">
      <div className="flex min-w-max flex-col items-center">
        {tree}
        <p className="mt-8 text-xs text-slate-500">
          {matches.length} matching word{matches.length === 1 ? "" : "s"} under this prefix
        </p>
      </div>
    </div>
  );
}
