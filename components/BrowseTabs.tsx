import Link from "next/link";

// One flat tab strip replacing the old Jobs / Events / Promotions nav items and
// their two nested sub-tab strips. Labels avoid internal jargon ("jobs",
// "extraction", "CSV") that confused non-technical users.
export const BROWSE_TABS = [
  { key: "promotions", label: "Offers", hint: "The promotional offers and codes we validate" },
  { key: "validations", label: "Validations", hint: "Each check we ran against a promotion" },
  { key: "discovery", label: "Discovery", hint: "Runs that look for new promotions on merchant sites" },
  { key: "bot-detection", label: "Bot detection", hint: "Merchants that blocked our automation" },
  { key: "client-files", label: "Client files", hint: "Files received from and sent to clients" },
] as const;

export type BrowseTabKey = (typeof BROWSE_TABS)[number]["key"];

export function parseBrowseTab(v: string | string[] | undefined): BrowseTabKey {
  const raw = typeof v === "string" ? v : undefined;
  const found = BROWSE_TABS.find((t) => t.key === raw);
  return found ? found.key : "promotions";
}

export function browseTabMeta(key: BrowseTabKey) {
  return BROWSE_TABS.find((t) => t.key === key)!;
}

export default function BrowseTabs({ active }: { active: BrowseTabKey }) {
  return (
    <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-300 bg-white p-0.5 text-sm w-fit">
      {BROWSE_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "promotions" ? "/promotions" : `/promotions?tab=${tab.key}`}
          className={`rounded-md px-3 py-1 ${
            active === tab.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
