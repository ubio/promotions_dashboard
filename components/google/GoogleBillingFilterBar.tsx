"use client";

import { useCallback, useRef, useState } from "react";
import MultiSelect from "@/components/reports/MultiSelect";
import { matchPreset, periodPresets } from "@/components/reports/PeriodPresets";

const CONTROL =
  "rounded border border-line bg-card px-2 py-1.5 text-sm text-ink hover:bg-page";

const ALL_TIME = "all";

export default function GoogleBillingFilterBar({
  action = "/billing/google",
  from,
  to,
  countries,
  selectedCountries,
}: {
  action?: string;
  from: string;
  to: string;
  countries: { value: string; label: string }[];
  selectedCountries: string[];
}) {
  const presets = periodPresets();
  const [periodKey, setPeriodKey] = useState(
    from && to ? (matchPreset(from, to)?.key ?? "custom") : ALL_TIME
  );
  const [range, setRange] = useState({ from, to });
  const formRef = useRef<HTMLFormElement>(null);

  const commit = useCallback(() => {
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  }, []);

  function onPeriodChange(key: string) {
    setPeriodKey(key);
    if (key === ALL_TIME) {
      setRange({ from: "", to: "" });
      commit();
      return;
    }
    const preset = presets.find((item) => item.key === key);
    if (preset) {
      setRange({ from: preset.from, to: preset.to });
      commit();
      return;
    }
    setRange((current) => {
      if (current.from && current.to) return current;
      const fallback = presets.find((item) => item.key === "30d");
      return fallback ? { from: fallback.from, to: fallback.to } : current;
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card p-2.5"
    >
      <select
        value={periodKey}
        onChange={(event) => onPeriodChange(event.target.value)}
        className={CONTROL}
        aria-label="Period"
      >
        <option value={ALL_TIME}>All time</option>
        {presets.map((preset) => (
          <option key={preset.key} value={preset.key}>
            {preset.label}
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
            onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
            onBlur={commit}
            className={CONTROL}
            aria-label="From"
          />
          <span className="text-faint">→</span>
          <input
            type="date"
            name="to"
            value={range.to}
            onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
            onBlur={commit}
            className={CONTROL}
            aria-label="To"
          />
        </span>
      ) : periodKey === ALL_TIME ? null : (
        <>
          <input type="hidden" name="from" value={range.from} />
          <input type="hidden" name="to" value={range.to} />
        </>
      )}

      <MultiSelect
        name="countries"
        options={countries}
        selected={selectedCountries}
        allLabel="All countries"
        noun="countries"
        searchable={countries.length > 8}
        onCommit={commit}
      />

      <noscript>
        <button className="rounded bg-primary px-4 py-1.5 text-sm text-card">Apply</button>
      </noscript>
      <a href={action} className="ml-auto px-1 text-sm text-muted hover:text-text">
        Reset
      </a>
    </form>
  );
}
