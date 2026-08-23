import type { ReactNode } from "react";

type Props = {
  prefix: string;
  matches: string[];
};

function Node({ label, active = false, children }: { label: string; active?: boolean; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold ${active ? "border-[#39745e] bg-[#39745e]/15 text-[#39745e]" : "border-[#d6e0da] bg-white text-[#53645c]"}`}>
        {label}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function TrieVisualizer({ prefix, matches }: Props) {
  const letters = [...prefix.toLowerCase()].filter(char => /[a-z0-9]/.test(char)).slice(0, 12);

  if (!letters.length) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-[#d6e0da] bg-white text-sm text-[#87948e]">
        Type a prefix to see the character-by-character traversal.
      </div>
    );
  }

  let tree: ReactNode = <Node label="root" />;
  for (let i = letters.length - 1; i >= 0; i -= 1) {
    tree = <Node label={letters[i]} active>{tree}</Node>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#dfe6e1] bg-white p-8">
      <div className="flex min-w-max flex-col items-center">
        {tree}
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-[#74817b]">
          <span className="rounded-full bg-[#edf5f0] px-3 py-1.5">{letters.length} characters traversed</span>
          <span className="rounded-full bg-[#f1f4f2] px-3 py-1.5">{matches.length} suggestions shown</span>
        </div>
      </div>
    </div>
  );
}
