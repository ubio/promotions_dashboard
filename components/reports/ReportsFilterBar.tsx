"use client";

import { useState } from "react";
import { periodPresets, matchPreset } from "./PeriodPresets";

const CONTROL =
  "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-50";

const GROUPS = [
  { value: "client", label: "Customer" },
  { value: "merchant", label: "Merchant" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "passed", label: "Passed only" },
  { value: "failed", label: "Failed only" },
  { value: "errored", label: "Errored only" },
];

export default function ReportsFilterBar({
  clientIds,
  domains,
  from,
  to,
  groupBy,
  outcome,
  selectedClients,
  domain,
}: {
  clientIds: string[];
  domains: string[];
  from: string;
  to: string;
  groupBy: string;
  outcome: string;
  selectedClients: string[];
  domain: string;
}) {
  const presets = periodPresets();
  const initialPreset = matchPreset(from, to)?.key ?? "custom";

  const [periodKey, setPeriodKey] = useState(initialPreset);
  const [range, setRange] = useState({ from, to });
  const [clients, setClients] = useState<string[]>(selectedClients);

  function onPeriodChange(key: string) {
    setPeriodKey(key);
    const preset = presets.find((p) => p.key === key);
    if (preset) setRange({ from: preset.from, to: preset.to });
  }

  function toggleClient(id: string) {
    setClients((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const clientLabel =
    clients.length === 0
      ? "All customers"
      : clients.length === 1
        ? clients[0]
        : `${clients.length} customers`;

  return (
    <form className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      {/* Period — presets collapse the old five-link row into one control */}
      <select
        value={periodKey}
        onChange={(e) => onPeriodChange(e.target.value)}
        className={CONTROL}
        aria-label="Period"
      >
        {presets.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>

      {periodKey === "custom" ? (
        <span className="flex items-center gap-1">
          <input
            type="date"
            name="from"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className={CONTROL}
            aria-label="From"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            name="to"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className={CONTROL}
            aria-label="To"
          />
        </span>
      ) : (
        <>
          <input type="hidden" name="from" value={range.from} />
          <input type="hidden" name="to" value={range.to} />
        </>
      )}

      {/* Customers — checkbox dropdown, supports one, several or all */}
      <details className="relative">
        <summary className={`${CONTROL} cursor-pointer list-none select-none`}>
          {clientLabel} <span className="text-slate-400">▾</span>
        </summary>
        <div className="absolute z-30 mt-1 min-w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => setClients([])}
            className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-sky-700 hover:bg-slate-100"
          >
            All customers
          </button>
          {clientIds.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100"
            >
              <input
                type="checkbox"
                checked={clients.includes(id)}
                onChange={() => toggleClient(id)}
              />
              {id}
            </label>
          ))}
        </div>
      </details>
      <input type="hidden" name="clientIds" value={clients.join(",")} />

      {/* Merchant — type-ahead over every known domain */}
      <input
        name="domains"
        list="report-domains"
        defaultValue={domain}
        placeholder="All merchants"
        className={`${CONTROL} w-44`}
        aria-label="Merchant"
      />
      <datalist id="report-domains">
        {domains.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <select name="outcome" defaultValue={outcome} className={CONTROL} aria-label="Outcome">
        {OUTCOMES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">by</span>
        <select name="groupBy" defaultValue={groupBy} className={CONTROL} aria-label="Group by">
          {GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </span>

      <button className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">
        Apply
      </button>
      <a href="/reports" className="px-1 text-sm text-slate-500 hover:text-slate-700">
        Reset
      </a>
    </form>
  );
}
