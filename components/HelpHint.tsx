"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_MAX_WIDTH_PX = 256;
const VIEWPORT_MARGIN_PX = 8;

function clampCenter(left: number): number {
  const half = TOOLTIP_MAX_WIDTH_PX / 2;
  const min = VIEWPORT_MARGIN_PX + half;
  const max = window.innerWidth - VIEWPORT_MARGIN_PX - half;
  if (min > max) return window.innerWidth / 2;
  return Math.min(Math.max(left, min), max);
}

export function HelpHint({
  hint,
  placement = "above",
}: {
  hint: string;
  placement?: "above" | "below";
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);
  const tipId = useId();

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltip({
      top: placement === "below" ? rect.bottom + 4 : rect.top - 4,
      left: clampCenter(rect.left + rect.width / 2),
    });
  }, [placement]);

  const hide = useCallback(() => setTooltip(null), []);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] leading-none normal-case text-slate-400"
        aria-label={hint}
        aria-describedby={tooltip ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        ?
      </button>
      {tooltip &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className="help-hint-tooltip pointer-events-none fixed z-[9999] max-w-[16rem] rounded-md border border-[#696969] bg-[#fafafa] px-2 py-1.5 text-xs font-medium leading-snug text-black shadow-[0_2px_8px_rgb(15_23_42_/_0.1)]"
            style={{
              top: tooltip.top,
              left: tooltip.left,
              transform: placement === "below" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            }}
          >
            {hint}
          </span>,
          document.body
        )}
    </>
  );
}

export function TableHeaderLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <HelpHint hint={hint} placement="below" />
    </span>
  );
}
