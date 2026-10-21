"use client";

// The suite's sidebar, as Orbit and Beacon wear it. workspace.css styles it
// through `data-slot` attributes belonging to the shared shadcn Sidebar
// component; that component isn't installed here (it would pull in a dozen
// runtime deps for a static nav), so this renders the same attributes by hand
// and lets the shared stylesheet do the work.
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  // The section this item owns, when that is broader than its own href:
  // Stats links to /stats/clients but stays lit across all of /stats.
  match?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// A link is current when it's the exact path, or when it owns the section the
// path sits in — /stats/merchants/x keeps Stats lit. "/" would own everything,
// so it only ever matches exactly.
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ groups, footer }: { groups: NavGroup[]; footer: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="oss-sidebar">
      <div className="brand">
        UBIO <span>Promotions</span>
      </div>
      <div data-slot="sidebar-content">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const current = isCurrent(pathname, item.match ?? item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-slot="sidebar-menu-button"
                  {...(current ? { "data-active": "", "aria-current": "page" as const } : {})}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div data-slot="sidebar-footer">{footer}</div>
    </aside>
  );
}
