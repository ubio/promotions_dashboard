"use client";

import { useRouter } from "next/navigation";

const CONTROL =
  "rounded border border-line bg-card px-2 py-1.5 text-sm text-ink hover:bg-page";

export default function OverviewCustomerSelect({
  clientIds,
  selected,
}: {
  clientIds: string[];
  selected?: string;
}) {
  const router = useRouter();
  const options =
    selected && !clientIds.includes(selected) ? [selected, ...clientIds] : clientIds;

  return (
    <form action="/" className="flex items-center gap-2">
      <select
        name="clientId"
        value={selected ?? ""}
        aria-label="Customer"
        className={CONTROL}
        onChange={(event) => {
          const value = event.currentTarget.value;
          router.push(value ? `/?clientId=${encodeURIComponent(value)}` : "/");
        }}
      >
        <option value="">All customers</option>
        {options.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <noscript>
        <button className="rounded bg-primary px-3 py-1.5 text-sm text-card">Apply</button>
      </noscript>
    </form>
  );
}
