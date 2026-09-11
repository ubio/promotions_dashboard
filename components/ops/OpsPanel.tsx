"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import type { ResetCandidateRow, ResetCandidatesPage } from "@/lib/ops-client";

interface ActionState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

const idleState: ActionState = { status: "idle", message: "" };
const PAGE_SIZE = 25;

function normalizeValidity(status?: string): string {
  if (!status) return "unknown";
  const map: Record<string, string> = {
    cannotValidate: "cannot_validate",
    insufficientValidations: "insufficient_validations",
    merchantAutomationIssues: "merchant_automation_issues",
  };
  return map[status] ?? status;
}

function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "…";
}

export default function OpsPanel() {
  const [candidates, setCandidates] = useState<ResetCandidatesPage | null>(null);
  const [page, setPage] = useState(1);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [exportState, setExportState] = useState<ActionState>(idleState);
  const [resetState, setResetState] = useState<ActionState>(idleState);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const loadCandidates = useCallback(async (targetPage: number) => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/ops/preview?${params}`, { cache: "no-store" });
      const body: unknown = await res.json();
      if (!res.ok) {
        const message =
          body != null &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Failed to load candidates";
        throw new Error(message);
      }
      const data = body as ResetCandidatesPage;
      setCandidates(data);
      setPage(data.page);
    } catch (error) {
      setCandidates(null);
      setListError(error instanceof Error ? error.message : "Failed to load candidates");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates(page);
  }, [loadCandidates, page]);

  async function runExport() {
    if (!window.confirm("Export client-facing and debug spreadsheets now for all clients?")) {
      return;
    }
    setExportState({ status: "loading", message: "Exporting…" });
    try {
      const res = await fetch("/api/ops/export-spreadsheets", { method: "POST" });
      const body: unknown = await res.json();
      if (!res.ok) {
        const message =
          body != null &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Export failed";
        throw new Error(message);
      }
      const message =
        body != null &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : "Spreadsheet export completed.";
      setExportState({ status: "success", message });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Export failed",
      });
    }
  }

  async function runResetAll() {
    const count = candidates?.total ?? 0;
    if (
      !window.confirm(
        `Reset validation state for all ${count} promotion(s) from today with non-client-facing failures? Manual locks (e.g. bot detection) are excluded.`
      )
    ) {
      return;
    }
    setResetState({ status: "loading", message: "Resetting all…" });
    try {
      const res = await fetch("/api/ops/reset-validations", { method: "POST" });
      const body: unknown = await res.json();
      if (!res.ok) {
        const message =
          body != null &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Reset failed";
        throw new Error(message);
      }
      const resetCount =
        body != null && typeof body === "object" && "resetCount" in body && typeof body.resetCount === "number"
          ? body.resetCount
          : 0;
      const deletedLogs =
        body != null && typeof body === "object" && "deletedLogs" in body && typeof body.deletedLogs === "number"
          ? body.deletedLogs
          : 0;
      setResetState({
        status: "success",
        message: `Reset ${resetCount} promotion(s); removed ${deletedLogs} validation log(s).`,
      });
      await loadCandidates(1);
    } catch (error) {
      setResetState({
        status: "error",
        message: error instanceof Error ? error.message : "Reset failed",
      });
    }
  }

  async function runResetSingle(row: ResetCandidateRow) {
    if (!window.confirm(`Reset validation for ${row.domain} (${row.clientId})?`)) {
      return;
    }
    setResettingId(row.id);
    setResetState(idleState);
    try {
      const res = await fetch(`/api/ops/reset-validations/${row.id}`, { method: "POST" });
      const body: unknown = await res.json();
      if (!res.ok) {
        const message =
          body != null &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Reset failed";
        throw new Error(message);
      }
      const deletedLogs =
        body != null && typeof body === "object" && "deletedLogs" in body && typeof body.deletedLogs === "number"
          ? body.deletedLogs
          : 0;
      setResetState({
        status: "success",
        message: `Reset ${row.domain}; removed ${deletedLogs} validation log(s).`,
      });
      const nextPage =
        candidates && candidates.items.length === 1 && candidates.page > 1
          ? candidates.page - 1
          : candidates?.page ?? 1;
      await loadCandidates(nextPage);
    } catch (error) {
      setResetState({
        status: "error",
        message: error instanceof Error ? error.message : "Reset failed",
      });
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Export spreadsheets</h2>
        <p className="mt-1 text-sm text-slate-500">
          Runs the same export the scheduler uses: client-facing results and debug error sheets for ZiffDavis and
          Atoll. Use when you need spreadsheets before the next scheduled run.
        </p>
        <button
          type="button"
          onClick={() => void runExport()}
          disabled={exportState.status === "loading"}
          className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {exportState.status === "loading" ? "Exporting…" : "Export spreadsheets now"}
        </button>
        {exportState.message && (
          <p
            className={`mt-3 text-sm ${
              exportState.status === "error" ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {exportState.message}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Reset non-client-facing failures (today)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Re-queues today&apos;s promotions that failed with automation or internal fail codes. Skips manual locks
          such as bot-detection merchants (shown as LOCK_WITHOUT_VALIDATION in spreadsheets). Clears validation logs
          so they can be validated again.
        </p>

        {listError ? (
          <p className="mt-4 text-sm text-red-600">{listError}</p>
        ) : candidates ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <p>
                <span className="font-medium">{candidates.total.toLocaleString()}</span> promotion(s) eligible on{" "}
                <span className="font-mono">{candidates.date}</span> (UTC)
                {Object.keys(candidates.byClient).length > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    ·{" "}
                    {Object.entries(candidates.byClient)
                      .map(([clientId, count]) => `${clientId}: ${count}`)
                      .join(", ")}
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadCandidates(page)}
                  disabled={listLoading}
                  className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void runResetAll()}
                  disabled={resetState.status === "loading" || candidates.total === 0}
                  className="rounded bg-amber-700 px-3 py-1 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {resetState.status === "loading" ? "Resetting all…" : "Reset all"}
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">Country</th>
                    <th className="px-3 py-2">Validity</th>
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">Fail codes</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listLoading && candidates.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : candidates.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                        No promotions eligible for reset today.
                      </td>
                    </tr>
                  ) : (
                    candidates.items.map((row) => (
                      <tr key={row.id} className="hover:bg-sky-50/50">
                        <td className="whitespace-nowrap px-3 py-2">{row.clientId}</td>
                        <td className="px-3 py-2">
                          <div>{row.domain}</div>
                          {row.merchantName && (
                            <div className="text-xs text-slate-400">{row.merchantName}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.countryCode ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={normalizeValidity(row.validityStatus)}>
                            {normalizeValidity(row.validityStatus).replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={row.reportType === "error" ? "error" : "conclusion"}>
                            {row.reportType ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {row.failCodes.length > 0 ? (
                              row.failCodes.map((code) => (
                                <Badge key={code} variant="code">
                                  {code}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[12rem] px-3 py-2">
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-sky-700 hover:underline"
                            title={row.sourceUrl}
                          >
                            {truncateUrl(row.sourceUrl)}
                          </a>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {row.detailId && (
                              <Link
                                href={`/promotions/${row.detailId}`}
                                className="text-sky-700 hover:underline"
                              >
                                View
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => void runResetSingle(row)}
                              disabled={resettingId === row.id || resetState.status === "loading"}
                              className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                            >
                              {resettingId === row.id ? "Resetting…" : "Reset"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {candidates.pages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>
                  Page {candidates.page} of {candidates.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={candidates.page <= 1 || listLoading}
                    className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(candidates.pages, p + 1))}
                    disabled={candidates.page >= candidates.pages || listLoading}
                    className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        )}

        {resetState.message && (
          <p
            className={`mt-3 text-sm ${resetState.status === "error" ? "text-red-600" : "text-emerald-700"}`}
          >
            {resetState.message}
          </p>
        )}
      </section>
    </div>
  );
}
