import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { CLIENT_CSV_EVENT_TYPES, formatClientCsvEventType } from "@/lib/events-model";
import {
  csvImportTurnaroundMs,
  getClientCsvClientIds,
  getClientCsvEvents,
  getCsvImportDeliveredAt,
} from "@/lib/events-queries";
import { formatCount, formatDate, formatDuration, formatUtcDay, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function ClientFilesStatsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = str(sp.q);
  const date = str(sp.date);
  const clientId = str(sp.clientId);
  const eventType = str(sp.eventType);
  const page = Number(str(sp.page) ?? "1") || 1;

  const [result, clientIds] = await Promise.all([
    getClientCsvEvents({ q, date, clientId, eventType, page }),
    getClientCsvClientIds(),
  ]);
  const deliveredAt = await getCsvImportDeliveredAt(result.items);

  const params = { q, date, clientId, eventType };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Client files</h1>
        <p className="text-sm text-muted">
          Audit log of CSV imports from S3 and promotions exports to the client bucket.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-3 text-sm">
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Created date (UTC)</span>
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
          <span className="text-xs text-muted">Event type</span>
          <select
            name="eventType"
            defaultValue={eventType ?? ""}
            className="max-w-full rounded border border-line px-2 py-1.5"
          >
            <option value="">All</option>
            {CLIENT_CSV_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatClientCsvEventType(type)}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-primary px-4 py-1.5 text-card hover:bg-primary-ink">Apply</button>
        <Link href="/stats/client-files" className="py-1.5 text-muted hover:text-text">
          Reset
        </Link>
        <label className="ml-auto flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Search (CSV name, bundle id)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="w-64 max-w-full rounded border border-line px-2 py-1.5"
            placeholder="e.g. promotions-sku"
          />
        </label>
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">CSV name</th>
              <th className="px-3 py-2">Bundle id</th>
              <th className="px-3 py-2">Bundle date</th>
              <th className="px-3 py-2">Data type</th>
              <th className="px-3 py-2">Records</th>
              <th className="px-3 py-2">Turnaround</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {result.items.map((event) => (
              <tr key={String(event._id)} className="hover:bg-tint">
                <td className="whitespace-nowrap px-3 py-2 text-text">
                  <div>{formatDate(event.createdAt)}</div>
                  <div className="text-xs text-faint">{formatUtcDay(event.createdAtDate)}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={event.eventType === "client-record-import" ? "conclusion" : "success"}>
                    {formatClientCsvEventType(String(event.eventType))}
                  </Badge>
                </td>
                <td className="px-3 py-2">{event.clientId}</td>
                <td className="px-3 py-2 font-mono text-xs">{event.csvName}</td>
                <td className="px-3 py-2 font-mono text-xs">{truncate(event.bundleId, 24)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-text">
                  {formatUtcDay(event.bundleDate)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="code">{event.dataType}</Badge>
                </td>
                <td className="px-3 py-2">{formatCount(event.recordCount)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {formatDuration(csvImportTurnaroundMs(event, deliveredAt))}
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-faint">
                  No CSV events match these filters.
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
        basePath="/stats/client-files"
        params={params}
      />
    </div>
  );
}
