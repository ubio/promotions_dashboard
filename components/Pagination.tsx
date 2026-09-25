import Link from "next/link";

export default function Pagination({
  page,
  pages,
  total,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-between py-3 text-sm text-text">
      <span>
        {total.toLocaleString()} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded border border-line bg-card px-3 py-1 hover:bg-page">
            ← Prev
          </Link>
        ) : (
          <span className="rounded border border-line px-3 py-1 text-faint">← Prev</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded border border-line bg-card px-3 py-1 hover:bg-page">
            Next →
          </Link>
        ) : (
          <span className="rounded border border-line px-3 py-1 text-faint">Next →</span>
        )}
      </div>
    </div>
  );
}
