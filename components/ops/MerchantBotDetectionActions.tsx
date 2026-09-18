"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "detected" | "fixed";

interface ActionState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  action: Action | null;
}

function BotGlyph() {
  return (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="3.8" r="1.2" fill="currentColor" />
      <circle cx="9" cy="13.5" r="1.3" fill="currentColor" />
      <circle cx="15" cy="13.5" r="1.3" fill="currentColor" />
      <path d="M9 17.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function IconBot({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <BotGlyph />
    </svg>
  );
}

function IconBotFixed({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <BotGlyph />
      <path d="M4 20 20 4" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function IconSpinner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" opacity="0.25" />
      <path
        d="M12 3.75a8.25 8.25 0 0 1 8.25 8.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconClass(layout: "compact" | "block"): string {
  return layout === "block" ? "h-5 w-5" : "h-4 w-4";
}

function jsonErrorMessage(body: unknown, fallback: string): string {
  if (
    body != null &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}

const idleState: ActionState = { status: "idle", message: "", action: null };

export default function MerchantBotDetectionActions({
  merchantId,
  domain,
  botDetected = false,
  botDetectionFixed = false,
  layout = "compact",
}: {
  merchantId: string;
  domain: string;
  botDetected?: boolean;
  botDetectionFixed?: boolean;
  layout?: "compact" | "block";
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(idleState);
  const label = domain || merchantId;
  const loading = state.status === "loading";
  const detectDisabled = loading || botDetected;
  const fixDisabled = loading || botDetectionFixed;

  async function runAction(action: Action) {
    const confirmed =
      action === "detected"
        ? window.confirm(
            `Mark ${label} as bot-detected? This suspends validations (botDetection: true, validationsAllowed: false).`
          )
        : window.confirm(
            `Mark bot detection as fixed for ${label}? This re-enables validations, sets the fixed flag, and resets botDetectionCount to 0.`
          );
    if (!confirmed) return;

    setState({
      status: "loading",
      message: action === "detected" ? "Marking bot-detected…" : "Marking fixed…",
      action,
    });
    try {
      const path =
        action === "detected"
          ? `/api/ops/merchants/${encodeURIComponent(merchantId)}/mark-bot-detected`
          : `/api/ops/merchants/${encodeURIComponent(merchantId)}/mark-bot-detection-fixed`;
      const res = await fetch(path, { method: "POST" });
      const body: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          jsonErrorMessage(
            body,
            action === "detected" ? "Failed to mark as bot-detected" : "Failed to mark as fixed"
          )
        );
      }
      setState({
        status: "success",
        message:
          action === "detected"
            ? `Marked ${label} as bot-detected.`
            : `Marked bot detection as fixed for ${label}.`,
        action,
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : action === "detected"
              ? "Failed to mark as bot-detected"
              : "Failed to mark as fixed",
        action,
      });
    }
  }

  const detectLabel = botDetected ? "Already bot-detected" : "Mark bot detected";
  const fixLabel = botDetectionFixed ? "Already marked fixed" : "Mark bot detection fixed";
  const iconSize = iconClass(layout);

  const buttons = (
    <>
      <button
        type="button"
        onClick={() => void runAction("detected")}
        disabled={detectDisabled}
        title={detectLabel}
        aria-label={detectLabel}
        className={
          layout === "block"
            ? "inline-flex items-center justify-center rounded border border-red-300 bg-white p-1.5 text-red-800 hover:bg-red-50 disabled:opacity-50"
            : "inline-flex items-center justify-center rounded border border-red-300 p-1 text-red-800 hover:bg-red-50 disabled:opacity-50"
        }
      >
        {loading && state.action === "detected" ? (
          <IconSpinner className={iconSize} />
        ) : (
          <IconBot className={iconSize} />
        )}
      </button>
      <button
        type="button"
        onClick={() => void runAction("fixed")}
        disabled={fixDisabled}
        title={fixLabel}
        aria-label={fixLabel}
        className={
          layout === "block"
            ? "inline-flex items-center justify-center rounded border border-emerald-300 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            : "inline-flex items-center justify-center rounded border border-emerald-300 p-1 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        }
      >
        {loading && state.action === "fixed" ? (
          <IconSpinner className={iconSize} />
        ) : (
          <IconBotFixed className={iconSize} />
        )}
      </button>
    </>
  );

  if (layout === "compact") {
    return (
      <div className="flex items-center gap-1">
        {buttons}
        {state.message && (
          <p className={`max-w-[12rem] text-[11px] ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{buttons}</div>
      {state.message && (
        <p className={`text-sm ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
