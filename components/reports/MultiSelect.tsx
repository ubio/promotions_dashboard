"use client";

import { useEffect, useRef, useState } from "react";

export interface Option {
  value: string;
  label: string;
}

// Dropdown that stays open while you tick boxes and closes as soon as focus
// moves away, keeping the selection. Value is submitted with the surrounding
// GET form via a hidden comma-joined input.
export default function MultiSelect({
  name,
  options,
  selected,
  allLabel,
  noun,
  searchable = false,
  width = "w-44",
}: {
  name: string;
  options: Option[];
  selected: string[];
  allLabel: string;
  noun: string;
  searchable?: boolean;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  const toggle = (value: string) =>
    setValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );

  const labelFor = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  const buttonLabel =
    values.length === 0
      ? allLabel
      : values.length === 1
        ? labelFor(values[0])
        : `${values.length} ${noun}`;

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={values.join(",")} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex ${width} items-center justify-between gap-2 rounded border border-slate-300 bg-white px-2 py-1.5 text-left text-sm ${
          values.length ? "text-slate-800" : "text-slate-500"
        } hover:bg-slate-50`}
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 min-w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          )}
          <button
            type="button"
            onClick={() => setValues([])}
            className="mb-0.5 w-full rounded px-2 py-1 text-left text-xs text-sky-700 hover:bg-slate-100"
          >
            {allLabel}
          </button>
          <div className="max-h-64 overflow-y-auto">
            {visible.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100"
              >
                <input
                  type="checkbox"
                  checked={values.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
            {visible.length === 0 && (
              <p className="px-2 py-2 text-xs text-slate-400">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
