// Building blocks for docs pages. Plain text inside them is styled by the
// `.docs-prose` rules in app/globals.css, so pages stay ordinary JSX.

export function DocHeader({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <header className="mb-6 border-b border-line pb-4">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {lead && <p className="mt-1.5 text-sm text-muted">{lead}</p>}
    </header>
  );
}

export function DocTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="docs-table">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <div className="docs-callout">{children}</div>;
}
