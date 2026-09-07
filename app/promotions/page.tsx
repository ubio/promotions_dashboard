import Link from "next/link";
import BrowseTabs, { browseTabMeta, parseBrowseTab } from "@/components/BrowseTabs";
import { ValidationJobs, ExtractionJobs } from "@/app/jobs/page";
import { BotDetectionEvents, CsvEvents } from "@/app/events/page";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { getPromotions, getPromotionClientIds } from "@/lib/queries";
import { formatDate, normalizeValidity, truncate, VALIDITY_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

async function PromotionsList({ sp }: { sp: Search }) {
  const q = str(sp.q);
  const clientId = str(sp.clientId);
  const validityStatus = str(sp.validityStatus);
  const page = Number(str(sp.page) ?? "1") || 1;

  const [result, clientIds] = await Promise.all([
    getPromotions({ q, clientId, validityStatus, page }),
    getPromotionClientIds(),
  ]);

  const params = { q, clientId, validityStatus };

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <input type="hidden" name="tab" value="promotions" />
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-slate-500">Search (domain, description, code, id)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="w-72 max-w-full rounded border border-slate-300 px-2 py-1.5"
            placeholder="e.g. aloyoga.com or SAVE25"
          />
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-slate-500">Client</span>
          <select name="clientId" defaultValue={clientId ?? ""} className="max-w-full rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {clientIds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-slate-500">Validity</span>
          <select
            name="validityStatus"
            defaultValue={validityStatus ?? ""}
            className="max-w-full rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">All</option>
            {VALIDITY_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">Apply</button>
        <Link href="/promotions" className="py-1.5 text-slate-500 hover:text-slate-700">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Validity</th>
              <th className="px-3 py-2">Error codes</th>
              <th className="px-3 py-2">Reasoning</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((p) => {
              const status = normalizeValidity(p.validityStatus);
              return (
                <tr key={String(p._id)} className="hover:bg-sky-50/50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {p.systemMeta?.createdAt ? formatDate(p.systemMeta.createdAt) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{p.clientId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.domain ?? "—"}</td>
                  <td className="min-w-72 max-w-md px-3 py-2">
                    <Link href={`/promotions/${p._id}`} className="text-sky-700 hover:underline">
                      {truncate(p.description || p.title || p.textOnPage || String(p._id), 110)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {p.conditions?.code ? <Badge variant="code">{p.conditions.code}</Badge> : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={status}>{status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-36 max-w-52 flex-wrap gap-1">
                      {(p.latestValidation?.failCodes ?? []).map((c: string) => (
                        <Badge key={c} variant="code">
                          {c}
                        </Badge>
                      ))}
                      {(p.latestValidation?.failCodes ?? []).length === 0 && "—"}
                    </div>
                  </td>
                  <td className="min-w-72 max-w-md px-3 py-2 text-xs text-slate-600">
                    {truncate(p.latestValidation?.reasoning, 140) || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {p.latestValidation?.screenshot ? (
                      <a
                        href={p.latestValidation.screenshot}
                        target="_blank"
                        className="text-sky-700 hover:underline"
                      >
                        screenshot
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                  No promotions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} basePath="/promotions" params={params} />
    </div>
  );
}


export default async function PromotionsHub({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const tab = parseBrowseTab(sp.tab);
  const meta = browseTabMeta(tab);
  const page = Number(str(sp.page) ?? "1") || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">{meta.label}</h1>
        <p className="text-xs text-slate-500">{meta.hint}</p>
      </div>

      <BrowseTabs active={tab} />

      {tab === "promotions" && <PromotionsList sp={sp} />}
      {tab === "validations" && (
        <ValidationJobs
          tab={tab}
          q={str(sp.q)}
          clientId={str(sp.clientId)}
          reportType={str(sp.reportType)}
          success={str(sp.success)}
          failCode={str(sp.failCode)}
          page={page}
        />
      )}
      {tab === "discovery" && (
        <ExtractionJobs
          tab={tab}
          q={str(sp.q)}
          failedDiscoveryCode={str(sp.failedDiscoveryCode)}
          page={page}
        />
      )}
      {tab === "bot-detection" && (
        <BotDetectionEvents
          tab={tab}
          q={str(sp.q)}
          date={str(sp.date)}
          clientId={str(sp.clientId)}
          status={str(sp.status)}
          page={page}
        />
      )}
      {tab === "client-files" && (
        <CsvEvents
          tab={tab}
          q={str(sp.q)}
          date={str(sp.date)}
          clientId={str(sp.clientId)}
          eventType={str(sp.eventType)}
          page={page}
        />
      )}
    </div>
  );
}
