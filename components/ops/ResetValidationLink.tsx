"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

function readError(body: unknown): string | null {
  if (
    body != null &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return null;
}

function ResetValidationButton({
  promotionId,
  domain,
  clientId,
}: {
  promotionId: string;
  domain?: string;
  clientId?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function reset() {
    const who = [domain, clientId].filter(Boolean).join(" · ") || promotionId;
    const confirmed = window.confirm(
      `Reset validation for ${who}? This clears its validation state so the server queues it again.`
    );
    if (!confirmed) return;

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/ops/reset-validation/${encodeURIComponent(promotionId)}`, {
        method: "POST",
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(readError(body) ?? "Reset failed");
      setStatus("success");
      setMessage("Queued");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Reset failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => void reset()}
        disabled={status === "loading"}
        className="whitespace-nowrap text-xs text-primary-ink hover:underline disabled:opacity-50"
      >
        {status === "loading" ? "Resetting…" : "Reset"}
      </button>
      {message && (
        <span
          className={`max-w-40 text-[11px] leading-tight ${status === "error" ? "text-bad" : "text-ok"}`}
          title={message}
        >
          {message}
        </span>
      )}
    </span>
  );
}

export default function ResetValidationLink({
  promotionId,
  domain,
  clientId,
}: {
  promotionId?: string;
  domain?: string;
  clientId?: string;
}) {
  if (!promotionId) return <span className="text-faint">—</span>;
  return (
    <ResetValidationButton promotionId={promotionId} domain={domain} clientId={clientId} />
  );
}
