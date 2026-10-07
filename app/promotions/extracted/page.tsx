import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import { extractedPromotionsQuery } from "@/lib/extracted-promotions";
import { formatCount, formatDate, truncate } from "@/lib/format";
import { EXTRACTED_ORIGIN_FILTERS, promotionOriginScope } from "@/lib/promotion-origin";

export const dynamic = "force-dynamic";

const BASE_PATH = "/promotions/extracted";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function ExtractedPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const filters = {
    origin: promotionOriginScope.parseExtractedOrigin(str(sp.origin)),
    clientId: str(sp.clientId),
    domain: str(sp.domain),
    q: str(sp.q),
    page: Number(str(sp.page) ?? 1) || 1,
  };

  const [result, clientIds, domains] = await Promise.all([
    extractedPromotionsQuery.list(filters),
    extractedPromotionsQuery.clientIds(),
    extractedPromotionsQuery.domains(),
  ]);

  const params = {
    origin: filters.origin,
    clientId: filters.clientId,
    domain: filters.domain,
    q: filters.q,
  };

  return (
    <div data-full-width className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Extracted promotions</h1>
        <p className="text-xs text-muted">
          {formatCount(result.total)} promotions we extracted or discovered ourselves · internal
          only, never shown to clients
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-card p-3 text-sm">
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Origin</span>
          <select name="origin" defaultValue={filters.origin ?? ""} className="max-w-full rounded border border-line px-2 py-1.5">
            <option value="">All extracted</option>
            {EXTRACTED_ORIGIN_FILTERS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Client</span>
          <select name="clientId" defaultValue={filters.clientId ?? ""} className="max-w-full rounded border border-line px-2 py-1.5">
            <option value="">All</option>
            {clientIds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Domain</span>
          <select name="domain" defaultValue={filters.domain ?? ""} className="max-w-full rounded border border-line px-2 py-1.5">
            <option value="">All</option>
            {domains.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-primary px-4 py-1.5 text-card hover:bg-primary-ink">Apply</button>
        <Link href={BASE_PATH} className="py-1.5 text-muted hover:text-text">
          Reset
        </Link>
        <label className="ml-auto flex max-w-full flex-col gap-1">
          <span className="text-xs text-muted">Search (domain, URL, title, code, id)</span>
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            className="w-64 max-w-full rounded border border-line px-2 py-1.5"
            placeholder="e.g. bestbuy.com"
          />
        </label>
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-page text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Description (EN)</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Qualified</th>
              <th className="px-3 py-2">Qualification codes</th>
              <th className="px-3 py-2">Extraction job</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {result.items.map((p) => {
              const qualificationCodes: string[] = p.qualification?.qualificationCodes ?? [];
              return (
                <tr key={String(p._id)} className="hover:bg-tint">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/promotions/${p._id}`} className="text-primary-ink hover:underline">
                      {formatDate(p.systemMeta?.createdAt)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge variant="code">{promotionOriginScope.originOf(p)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{p.clientId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.domain ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.countryCode ?? "—"}</td>
                  <td className="min-w-80 max-w-lg px-3 py-2 text-xs text-text">
                    {truncate(p.description, 160) || "—"}
                  </td>
                  <td className="min-w-80 max-w-lg px-3 py-2 text-xs text-text">
                    {truncate(p.descriptionEn, 160) || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {p.conditions?.code ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {typeof p.qualification?.isQualified === "boolean" ? (
                      <Badge variant={p.qualification.isQualified ? "success" : "fail"}>
                        {p.qualification.isQualified ? "qualified" : "not qualified"}
                      </Badge>
                    ) : (
                      <Badge variant="unknown">unknown</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-36 max-w-52 flex-wrap gap-1">
                      {qualificationCodes.map((c) => (
                        <Badge key={c} variant="code">
                          {c}
                        </Badge>
                      ))}
                      {qualificationCodes.length === 0 && "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {p.extractionLogId ? (
                      <Link href={`/jobs/extraction/${p.extractionLogId}`} className="text-primary-ink hover:underline">
                        {String(p.extractionLogId)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-faint">
                  No extracted promotions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} basePath={BASE_PATH} params={params} />
    </div>
  );
}
