"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<{ href: string; label: string; prefix: string }> = [
  { href: "/stats", label: "Pipeline", prefix: "/stats" },
  { href: "/stats/clients", label: "Clients", prefix: "/stats/clients" },
  { href: "/stats/merchants", label: "Merchants", prefix: "/stats/merchants" },
  { href: "/stats/bot-detection", label: "Bot detection", prefix: "/stats/bot-detection" },
  { href: "/stats/client-files", label: "Client files", prefix: "/stats/client-files" },
];

function isActive(pathname: string, href: string, prefix: string): boolean {
  if (href === "/stats") return pathname === "/stats";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function StatsNav() {
  const pathname = usePathname();
  return (
    <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm w-fit">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-md px-3 py-1 ${
            isActive(pathname, item.href, item.prefix)
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
