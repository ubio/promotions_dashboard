"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type RestartValidationRow = {
  promotionId: string;
  domain?: string;
  clientId?: string;
};

type Status = "idle" | "loading" | "success" | "error";

type RestartResponse = {
  resetCount?: number;
  failed: { promotionId: string; error: string }[];
  error?: string;
};

type RestartValidationsState = {
  rows: RestartValidationRow[];
  selected: ReadonlySet<string>;
  toggle: (promotionId: string) => void;
  setAll: (on: boolean) => void;
  status: Status;
  message: string;
  restart: () => Promise<void>;
};

const RestartValidationsContext = createContext<RestartValidationsState | null>(null);

function useRestartValidations(): RestartValidationsState {
  const value = useContext(RestartValidationsContext);
  if (!value) {
    throw new Error("Restart validations controls must be inside RestartValidations");
  }
  return value;
}

function uniquePromotionIds(rows: RestartValidationRow[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.promotionId)) continue;
    seen.add(row.promotionId);
    ids.push(row.promotionId);
  }
  return ids;
}

function readRestartResponse(body: unknown): RestartResponse {
  if (body == null || typeof body !== "object") return { failed: [] };
  const resetCount =
    "resetCount" in body && typeof body.resetCount === "number" ? body.resetCount : undefined;
  const error = "error" in body && typeof body.error === "string" ? body.error : undefined;
  const failed: { promotionId: string; error: string }[] = [];
  if ("failed" in body && Array.isArray(body.failed)) {
    for (const item of body.failed) {
      if (
        item != null &&
        typeof item === "object" &&
        "promotionId" in item &&
        typeof item.promotionId === "string" &&
        "error" in item &&
        typeof item.error === "string"
      ) {
        failed.push({ promotionId: item.promotionId, error: item.error });
      }
    }
  }
  return { resetCount, failed, error };
}

function validationLabel(row: RestartValidationRow): string {
  return [row.domain, row.clientId].filter(Boolean).join(" · ") || row.promotionId;
}

export function RestartValidations({
  rows,
  children,
}: {
  rows: RestartValidationRow[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function clearStatus() {
    if (status === "loading") return;
    setStatus("idle");
    setMessage("");
  }

  function toggle(promotionId: string) {
    if (status === "loading") return;
    clearStatus();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(promotionId)) next.delete(promotionId);
      else next.add(promotionId);
      return next;
    });
  }

  function setAll(on: boolean) {
    if (status === "loading") return;
    clearStatus();
    setSelected(on ? new Set(uniquePromotionIds(rows)) : new Set());
  }

  function chosenRows(): RestartValidationRow[] {
    const seen = new Set<string>();
    const chosen: RestartValidationRow[] = [];
    for (const row of rows) {
      if (!selected.has(row.promotionId) || seen.has(row.promotionId)) continue;
      seen.add(row.promotionId);
      chosen.push(row);
    }
    return chosen;
  }

  async function restart() {
    const chosen = chosenRows();
    const single = chosen.length === 1 ? chosen[0] : undefined;
    if (chosen.length === 0 || status === "loading") return;

    const confirmed = window.confirm(
      single
        ? `Restart validation for ${validationLabel(single)}? This clears its validation state so the server queues it again.`
        : `Restart ${chosen.length} validations? This clears their validation state so the server queues them again.`
    );
    if (!confirmed) return;

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/ops/reset-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotionIds: chosen.map((row) => row.promotionId) }),
      });
      const parsed = readRestartResponse(await res.json().catch(() => null));
      if (!res.ok) {
        setStatus("error");
        setMessage(parsed.error ?? "Restart failed");
        return;
      }
      const resetCount = parsed.resetCount ?? 0;
      if (parsed.failed.length > 0) {
        setStatus("error");
        setSelected(new Set(parsed.failed.map((item) => item.promotionId)));
        const reason = parsed.failed[0]?.error ?? "Restart failed";
        setMessage(
          `Restarted ${resetCount}. ${parsed.failed.length} failed: ${reason}`
        );
        return;
      }
      setStatus("success");
      setSelected(new Set());
      setMessage(resetCount === 1 ? "Restarted 1 validation." : `Restarted ${resetCount} validations.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Restart failed");
    }
  }

  return (
    <RestartValidationsContext.Provider
      value={{ rows, selected, toggle, setAll, status, message, restart }}
    >
      {children}
    </RestartValidationsContext.Provider>
  );
}

export function RestartValidationsButton() {
  const { rows, selected, status, message, restart } = useRestartValidations();
  const selectedCount = uniquePromotionIds(rows).filter((id) => selected.has(id)).length;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void restart()}
        disabled={selectedCount === 0 || status === "loading"}
        className="rounded border border-line bg-card px-3 py-1.5 text-sm hover:bg-rule disabled:opacity-50"
      >
        {status === "loading" ? "Restarting…" : "Restart Validations"}
      </button>
      {message ? (
        <span
          className={`max-w-72 text-right text-[11px] leading-tight ${status === "error" ? "text-bad" : "text-ok"}`}
          title={message}
        >
          {message}
        </span>
      ) : null}
    </span>
  );
}

export function RestartValidationsSelectAll() {
  const { rows, selected, setAll, status } = useRestartValidations();
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = uniquePromotionIds(rows);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={allSelected}
      disabled={ids.length === 0 || status === "loading"}
      aria-label="Select all validations"
      onChange={(event) => setAll(event.target.checked)}
    />
  );
}

export function RestartValidationCheckbox({
  promotionId,
  domain,
}: {
  promotionId?: string;
  domain?: string;
}) {
  const { selected, toggle, status } = useRestartValidations();
  if (!promotionId) return <span className="text-faint">—</span>;
  return (
    <input
      type="checkbox"
      checked={selected.has(promotionId)}
      disabled={status === "loading"}
      aria-label={domain ? `Select ${domain}` : "Select validation"}
      onChange={() => toggle(promotionId)}
    />
  );
}
