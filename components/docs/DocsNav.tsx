"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Reading order of the docs. Add a page here to list it in the side nav and
// the previous / next links.
export const DOC_PAGES = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/architecture", label: "Architecture" },
  { href: "/docs/a3-integration", label: "A3 integration" },
  { href: "/docs/google-pipeline", label: "Google pipeline" },
  { href: "/docs/ziff-davis-pipeline", label: "Ziff Davis pipeline" },
  { href: "/docs/validation-verdict", label: "Validation verdict" },
  { href: "/docs/dashboard", label: "Dashboard" },
  { href: "/docs/cheatsheet", label: "Cheatsheet" },
];

function useCurrentIndex(): number {
  const pathname = usePathname() ?? "/docs";
  return DOC_PAGES.findIndex((page) => page.href === pathname.replace(/\/$/, ""));
}

export function DocsNav() {
  const current = useCurrentIndex();
  return (
    <nav className="text-sm">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-faint">
        System docs
      </div>
      <ol className="space-y-0.5">
        {DOC_PAGES.map((page, index) => {
          const active = index === current;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex gap-2 rounded-md bg-primary-tint px-2 py-1.5 font-medium text-primary-ink"
                    : "flex gap-2 rounded-md px-2 py-1.5 text-text-2 hover:bg-tint hover:text-ink"
                }
              >
                <span className="w-4 text-right text-faint [font-variant-numeric:tabular-nums]">
                  {index === 0 ? "" : index}
                </span>
                {page.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DocsPager() {
  const current = useCurrentIndex();
  if (current < 0) return null;
  const prev = DOC_PAGES[current - 1];
  const next = DOC_PAGES[current + 1];
  return (
    <div className="mt-4 flex gap-3 text-sm">
      {prev && (
        <Link
          href={prev.href}
          className="flex-1 rounded-lg border border-line bg-card px-4 py-3 hover:border-primary-ink"
        >
          <div className="text-xs text-faint">← Previous</div>
          <div className="font-medium text-primary-ink">{prev.label}</div>
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          className="flex-1 rounded-lg border border-line bg-card px-4 py-3 text-right hover:border-primary-ink"
        >
          <div className="text-xs text-faint">Next →</div>
          <div className="font-medium text-primary-ink">{next.label}</div>
        </Link>
      )}
    </div>
  );
}
