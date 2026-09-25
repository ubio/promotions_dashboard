export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold text-text">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function KVGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-faint">{k}</dt>
          <dd className="text-sm text-ink break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
