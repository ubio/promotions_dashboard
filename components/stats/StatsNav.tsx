"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<{ href: string; label: string; prefix: string }> = [
  { href: "/stats/clients", label: "Clients", prefix: "/stats/clients" },
  { href: "/stats/merchants", label: "Merchants", prefix: "/stats/merchants" },
  { href: "/stats/bot-detection", label: "Bot detection", prefix: "/stats/bot-detection" },
  { href: "/stats/client-files", label: "Client files", prefix: "/stats/client-files" },
  { href: "/stats/script-failing", label: "Script failing", prefix: "/stats/script-failing" },
];

function isActive(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function StatsNav() {
  const pathname = usePathname();
  return (
    <div className="flex rounded-lg border border-line bg-card p-0.5 text-sm w-fit">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-md px-3 py-1 ${
            isActive(pathname, item.prefix)
              ? "bg-primary text-card"
              : "text-text hover:bg-rule"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
