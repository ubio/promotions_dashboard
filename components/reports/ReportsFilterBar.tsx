"use client";

import { useCallback, useRef, useState } from "react";
import MultiSelect from "./MultiSelect";
import { periodPresets, matchPreset } from "./PeriodPresets";

const CONTROL =
  "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-50";

const OUTCOMES = [
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "no_result", label: "No result" },
];

export default function ReportsFilterBar({
  action = "/reports",
  clientIds,
  domains,
  from,
  to,
  groupBy,
  outcomes,
  selectedClients,
  selectedDomains,
}: {
  action?: string;
  clientIds: string[];
  domains: string[];
  from: string;
  to: string;
  groupBy: string;
  outcomes: string[];
  selectedClients: string[];
  selectedDomains: string[];
}) {
  const presets = periodPresets();
  const [periodKey, setPeriodKey] = useState(matchPreset(from, to)?.key ?? "custom");
  const [range, setRange] = useState({ from, to });
  const formRef = useRef<HTMLFormElement>(null);

  // Filters apply as soon as a choice is made. Multi-selects commit when they
  // close rather than on each tick, so one decision costs one request.
  // setTimeout rather than requestAnimationFrame: rAF is paused in background
  // tabs, which would silently drop the submit. The 0ms defer lets React flush
  // the state change into the hidden inputs first.
  const commit = useCallback(() => {
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  }, []);

  function onPeriodChange(key: string) {
    setPeriodKey(key);
    const preset = presets.find((p) => p.key === key);
    if (preset) {
      setRange({ from: preset.from, to: preset.to });
      commit();
    }
  }

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
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
            onBlur={commit}
            className={CONTROL}
            aria-label="From"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            name="to"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            onBlur={commit}
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

      <MultiSelect
        name="clientIds"
        options={clientIds.map((c) => ({ value: c, label: c }))}
        selected={selectedClients}
        allLabel="All customers"
        noun="customers"
        searchable={clientIds.length > 8}
        onCommit={commit}
      />

      <MultiSelect
        name="domains"
        options={domains.map((d) => ({ value: d, label: d }))}
        selected={selectedDomains}
        allLabel="All merchants"
        noun="merchants"
        searchable
        width="w-48"
        onCommit={commit}
      />

      <MultiSelect
        name="outcomes"
        options={OUTCOMES}
        selected={outcomes}
        allLabel="All outcomes"
        noun="outcomes"
        onCommit={commit}
      />

      {/* Breakdown is a property of the table, not a filter — it lives above the
          table. Carried here so applying filters keeps the current breakdown. */}
      <input type="hidden" name="groupBy" value={groupBy} />

      {/* Filters apply on selection; this keeps the form usable without JS. */}
      <noscript>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white">Apply</button>
      </noscript>
      <a href={action} className="ml-auto px-1 text-sm text-slate-500 hover:text-slate-700">
        Reset
      </a>
    </form>
  );
}
