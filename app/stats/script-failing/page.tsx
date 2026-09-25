import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { formatBotDetectionResolution, scriptFailuresFromEvent } from "@/lib/events-model";
import { getScriptFailingClientIds, getScriptFailingEvents } from "@/lib/events-queries";
import { formatCount, formatDate, formatUtcDay, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function ScriptFailingStatsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = str(sp.q);
  const date = str(sp.date);
  const clientId = str(sp.clientId);
  const status = str(sp.status);
  const page = Number(str(sp.page) ?? "1") || 1;

  const [result, clientIds] = await Promise.all([
    getScriptFailingEvents({ q, date, clientId, status, page }),
    getScriptFailingClientIds(),
  ]);

  const params = { q, date, clientId, status };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Script failing</h1>
        <p className="text-sm text-muted">
          Audit log of merchants flagged after repeated merchant script failures.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-3 text-sm">
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Detected date (UTC)</span>
          <input
            name="date"
            type="date"
            defaultValue={date ?? ""}
            className="rounded border border-line px-2 py-1.5"
          />
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Client</span>
          <select
            name="clientId"
            defaultValue={clientId ?? ""}
            className="max-w-full rounded border border-line px-2 py-1.5"
          >
            <option value="">All</option>
            {clientIds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="max-w-full rounded border border-line px-2 py-1.5"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <button className="rounded bg-primary px-4 py-1.5 text-card hover:bg-primary-ink">Apply</button>
        <Link href="/stats/script-failing" className="py-1.5 text-muted hover:text-text">
          Reset
        </Link>
        <label className="ml-auto flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Search (domain, merchant id, promotion id, error)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="w-64 max-w-full rounded border border-line px-2 py-1.5"
            placeholder="e.g. bestbuy.com"
          />
        </label>
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Detected</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Script issues</th>
              <th className="px-3 py-2">Trigger client</th>
              <th className="px-3 py-2">Trigger promotion</th>
              <th className="px-3 py-2">Clients</th>
              <th className="px-3 py-2">Failures</th>
              <th className="px-3 py-2">Resolution</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {result.items.map((event) => {
              const scriptFailures = scriptFailuresFromEvent(event);
              return (
                <tr key={String(event._id)} className="hover:bg-tint">
                  <td className="whitespace-nowrap px-3 py-2 text-text">
                    <div>{formatDate(event.detectedAt)}</div>
                    <div className="text-xs text-faint">{formatUtcDay(event.detectedDate)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{event.domain}</td>
                  <td className="px-3 py-2">
                    <Badge variant={event.resolvedAt ? "valid" : "fail"}>
                      {event.resolvedAt ? "resolved" : "open"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{formatCount(event.scriptIssuesCount)}</td>
                  <td className="px-3 py-2">{event.triggerClientId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {event.triggerPromotionId ? (
                      <Link
                        href={`/promotions/${event.triggerPromotionId}`}
                        className="text-primary-ink hover:underline"
                      >
                        {truncate(event.triggerPromotionId, 16)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-40 flex-wrap gap-1">
                      {(event.clientIds ?? []).map((id: string) => (
                        <Badge key={id} variant="code">
                          {id}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="min-w-48 max-w-sm px-3 py-2 text-xs text-text">
                    {scriptFailures.length > 0 ? (
                      <div className="space-y-1">
                        {scriptFailures.map((failure, index) => (
                          <div key={`${failure.stageName}-${index}`}>
                            <Badge variant="code">{failure.stageName}</Badge>
                            <div className="mt-0.5">{truncate(failure.error, 80)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text">
                    {event.resolvedAt ? (
                      <div>
                        <div>{formatBotDetectionResolution(event.resolution)}</div>
                        <div className="text-xs text-faint">
                          {formatDate(event.resolvedAt)}
                          {event.resolvedBy ? ` · ${event.resolvedBy}` : ""}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="min-w-48 max-w-xs px-3 py-2 text-xs text-text">
                    {truncate(event.notes, 80)}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-faint">
                  No script failing events match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={result.page}
        pages={result.pages}
        total={result.total}
        basePath="/stats/script-failing"
        params={params}
      />
    </div>
  );
}
