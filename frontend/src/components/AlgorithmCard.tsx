type Props = { title: string; complexity: string; description: string };

export default function AlgorithmCard({ title, complexity, description }: Props) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <code className="rounded bg-slate-800 px-2 py-1 text-xs text-cyan-300">{complexity}</code>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
