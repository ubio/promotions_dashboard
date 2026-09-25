export default function RawJson({ data, label = "Raw JSON" }: { data: unknown; label?: string }) {
  return (
    <details className="rounded-lg border border-line bg-card">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-text hover:bg-page">
        {label}
      </summary>
      <pre className="overflow-x-auto border-t border-line bg-[var(--oss-code-bg)] p-4 text-xs leading-relaxed text-[var(--oss-code-ink)] font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
