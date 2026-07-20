export default function RawJson({ data, label = "Raw JSON" }: { data: unknown; label?: string }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {label}
      </summary>
      <pre className="overflow-x-auto border-t border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
