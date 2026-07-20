import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { getPromotions, getPromotionClientIds } from "@/lib/queries";
import { normalizeValidity, truncate, VALIDITY_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
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
      <h1 className="text-xl font-semibold">Promotions</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Search (domain, description, code, id)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="w-72 rounded border border-slate-300 px-2 py-1.5"
            placeholder="e.g. aloyoga.com or SAVE25"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Client</span>
          <select name="clientId" defaultValue={clientId ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {clientIds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Validity</span>
          <select
            name="validityStatus"
            defaultValue={validityStatus ?? ""}
            className="rounded border border-slate-300 px-2 py-1.5"
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
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Validity</th>
              <th className="px-3 py-2">Last validation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((p) => {
              const status = normalizeValidity(p.validityStatus);
              return (
                <tr key={String(p._id)} className="hover:bg-sky-50/50">
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
                    {p.latestValidation ? (
                      <Badge variant={p.latestValidation.success ? "success" : "fail"}>
                        {p.latestValidation.success ? "success" : "failed"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
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
