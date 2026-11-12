"use client";

import { useState } from "react";
import type {
  ExtractionStatus,
  RestartExtractionResult,
  StopExtractionResult,
} from "@/lib/ops-client";

interface ActionState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

const idleState: ActionState = { status: "idle", message: "" };

async function callOps<T>(path: string, method: "GET" | "POST"): Promise<T> {
  const res = await fetch(path, { method, cache: "no-store" });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body != null && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed";
}

function ActionRow({
  title,
  description,
  buttonLabel,
  loadingLabel,
  tone,
  state,
  disabled,
  onClick,
}: {
  title: string;
  description: React.ReactNode;
  buttonLabel: string;
  loadingLabel: string;
  tone: "bad" | "primary";
  state: ActionState;
  disabled: boolean;
  onClick: () => void;
}) {
  const buttonClass =
    tone === "bad"
      ? "bg-bad text-card hover:bg-bad/85"
      : "bg-primary text-card hover:bg-primary-ink";
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <div className="sm:w-56 sm:shrink-0">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`w-full rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${buttonClass}`}
        >
          {state.status === "loading" ? loadingLabel : buttonLabel}
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="mt-1 space-y-2 text-sm text-muted">{description}</div>
        {state.message && (
          <p className={`mt-3 text-sm ${state.status === "error" ? "text-bad" : "text-ok"}`}>
            {state.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ExtractionControls({
  initialStatus,
}: {
  initialStatus: ExtractionStatus | null;
}) {
  const [status, setStatus] = useState<ExtractionStatus | null>(initialStatus);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [stopState, setStopState] = useState<ActionState>(idleState);
  const [restartState, setRestartState] = useState<ActionState>(idleState);
  const busy = stopState.status === "loading" || restartState.status === "loading";

  async function refreshStatus() {
    try {
      setStatus(await callOps<ExtractionStatus>("/api/ops/extraction/status", "GET"));
      setStatusError(null);
    } catch (error) {
      setStatusError(errorMessage(error));
    }
  }

  async function stopExtraction() {
    const waiting = status ? `${status.notLocked.toLocaleString()} source(s)` : "every source";
    if (
      !window.confirm(
        `Stop extraction? ${waiting} waiting for extraction will be put on hold. Jobs already running in A3 will finish.`
      )
    ) {
      return;
    }
    setStopState({ status: "loading", message: "" });
    try {
      const result = await callOps<StopExtractionResult>("/api/ops/extraction/stop", "POST");
      setStopState({
        status: "success",
        message: `Put ${result.stoppedCount.toLocaleString()} source(s) on hold (${result.lockId}).`,
      });
    } catch (error) {
      setStopState({ status: "error", message: errorMessage(error) });
    }
    await refreshStatus();
  }

  async function restartExtraction() {
    const count = status ? `${(status.stopped + status.failed).toLocaleString()} source(s)` : "all held and failed sources";
    if (!window.confirm(`Restart extraction? ${count} will be queued for extraction again.`)) {
      return;
    }
    setRestartState({ status: "loading", message: "" });
    try {
      const result = await callOps<RestartExtractionResult>("/api/ops/extraction/restart", "POST");
      setRestartState({
        status: "success",
        message: `Queued ${result.restartedCount.toLocaleString()} source(s) again: ${result.stoppedCount.toLocaleString()} stopped, ${result.failedCount.toLocaleString()} failed.`,
      });
    } catch (error) {
      setRestartState({ status: "error", message: errorMessage(error) });
    }
    await refreshStatus();
  }

  return (
    <section className="rounded-lg border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Extraction</h2>
        <div className="flex items-center gap-3 text-sm text-text">
          {statusError ? (
            <span className="text-bad">{statusError}</span>
          ) : status ? (
            <span>
              <span className="font-medium">{status.notLocked.toLocaleString()}</span> waiting ·{" "}
              <span className="font-medium">{status.stopped.toLocaleString()}</span> stopped ·{" "}
              <span className="font-medium">{status.failed.toLocaleString()}</span> failed
            </span>
          ) : (
            <span className="text-faint">Status unavailable</span>
          )}
          <button
            type="button"
            onClick={() => void refreshStatus()}
            className="rounded border border-line px-3 py-1 hover:bg-page"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="divide-y divide-rule">
        <ActionRow
          title="Stop extraction"
          description={
            <>
              <p>
                Puts every source that is still waiting for extraction on hold, so no new extraction jobs are sent to
                A3. Jobs that are already running finish normally.
              </p>
              <p>
                Use this when extractions are failing across the board (a broken script, a proxy or A3 outage) and new
                jobs would only fail too. The Google export does not wait for stopped sources: it ships what has
                been extracted, and stopped sources go out in a later export once restarted.
              </p>
            </>
          }
          buttonLabel="Stop extraction"
          loadingLabel="Stopping…"
          tone="bad"
          state={stopState}
          disabled={busy}
          onClick={() => void stopExtraction()}
        />
        <ActionRow
          title="Restart extraction"
          description={
            <>
              <p>
                Sends back to the queue every source stopped with the button above, plus every source whose
                extraction job failed. They are picked up again on the next scheduled run.
              </p>
              <p>Use this once the underlying problem is fixed.</p>
            </>
          }
          buttonLabel="Restart extraction"
          loadingLabel="Restarting…"
          tone="primary"
          state={restartState}
          disabled={busy}
          onClick={() => void restartExtraction()}
        />
      </div>
    </section>
  );
}
