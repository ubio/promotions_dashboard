"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";

interface CollapsibleGroupContextValue {
  isOpen: (id: string) => boolean;
  setOpen: (id: string, open: boolean) => void;
  register: (id: string) => void;
}

const CollapsibleGroupContext = createContext<CollapsibleGroupContextValue | null>(null);

export function CollapsibleGroup({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isOpen = useCallback(
    (id: string) => (id in overrides ? overrides[id] : defaultOpen),
    [defaultOpen, overrides]
  );

  const setOpen = useCallback((id: string, open: boolean) => {
    setOverrides((current) => ({ ...current, [id]: open }));
  }, []);

  const register = useCallback((id: string) => {
    setIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const value = useMemo(() => ({ isOpen, setOpen, register }), [isOpen, setOpen, register]);
  const allOpen = ids.length > 0 && ids.every((id) => isOpen(id));
  const allClosed = ids.length > 0 && ids.every((id) => !isOpen(id));

  function setAll(open: boolean) {
    setDefaultOpen(open);
    setOverrides({});
  }

  return (
    <CollapsibleGroupContext.Provider value={value}>
      <div className="space-y-4">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={allClosed}
            onClick={() => setAll(false)}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:hover:text-slate-300"
          >
            Close all
          </button>
          <button
            type="button"
            disabled={allOpen}
            onClick={() => setAll(true)}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:hover:text-slate-300"
          >
            Open all
          </button>
        </div>
        {children}
      </div>
    </CollapsibleGroupContext.Provider>
  );
}

export function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const ctx = useContext(CollapsibleGroupContext);
  const register = ctx?.register;
  const [localOpen, setLocalOpen] = useState(false);
  const open = ctx ? ctx.isOpen(id) : localOpen;

  useEffect(() => {
    register?.(id);
  }, [register, id]);

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    const next = event.currentTarget.open;
    if (next === open) return;
    if (ctx) ctx.setOpen(id, next);
    else setLocalOpen(next);
  }

  return (
    <details
      open={open}
      onToggle={handleToggle}
      className="rounded-lg border border-slate-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className="text-xs font-medium text-slate-400">{open ? "Hide" : "Show"}</span>
      </summary>
      {open && <div className="border-t border-slate-200 p-4">{children}</div>}
    </details>
  );
}
