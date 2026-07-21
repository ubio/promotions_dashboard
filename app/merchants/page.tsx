import Link from "next/link";
import Pagination from "@/components/Pagination";
import { getMerchants, getCostsByDomain } from "@/lib/queries";
import { formatCost } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function MerchantsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = str(sp.q);
  const page = Number(str(sp.page) ?? "1") || 1;

  const [result, costs] = await Promise.all([getMerchants({ q, page }), getCostsByDomain()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Merchants</h1>
      <p className="text-sm text-slate-500">
        Validation stats come from the merchants collection; costs are summed from each
        merchant&apos;s validation and extraction jobs.
      </p>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-slate-500">Search (domain)</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="w-64 max-w-full rounded border border-slate-300 px-2 py-1.5"
            placeholder="e.g. etsy.com"
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">Apply</button>
        <Link href="/merchants" className="py-1.5 text-slate-500 hover:text-slate-700">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Clients</th>
              <th className="px-3 py-2">Promotions</th>
              <th className="px-3 py-2">Valid / Invalid</th>
              <th className="px-3 py-2">Validations</th>
              <th className="px-3 py-2">Bot detection</th>
              <th className="px-3 py-2">Site issues</th>
              <th className="px-3 py-2">Validation cost</th>
              <th className="px-3 py-2">Extraction cost</th>
              <th className="px-3 py-2">Total cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((m) => {
              const p = m.stats?.promotionsStats ?? {};
              const v = m.stats?.validationsStats ?? {};
              const cost = m.domain ? costs.get(m.domain) : undefined;
              const total = (cost?.validationCost ?? 0) + (cost?.extractionCost ?? 0);
              return (
                <tr key={String(m._id)} className="hover:bg-sky-50/50">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/jobs?q=${encodeURIComponent(m.domain ?? "")}`} className="text-sky-700 hover:underline">
                      {m.domain ?? String(m._id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{(m.clientIds ?? []).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{p.totalPromotionsCount ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="text-green-700">{p.validCount ?? 0}</span>
                    {" / "}
                    <span className="text-red-600">{p.invalidCount ?? 0}</span>
                  </td>
                  <td className="px-3 py-2">{v.totalValidationsCount ?? "—"}</td>
                  <td className="px-3 py-2">{v.botDetectionValidationCount ?? "—"}</td>
                  <td className="px-3 py-2">{v.merchantWebsiteIssuesCount ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatCost(cost?.validationCost)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatCost(cost?.extractionCost)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{formatCost(total)}</td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                  No merchants match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} basePath="/merchants" params={{ q }} />
    </div>
  );
}
