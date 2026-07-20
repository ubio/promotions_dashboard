import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import {
  getValidationJobs,
  getExtractionJobs,
  getClientIds,
  getFailCodes,
  getFailedDiscoveryCodes,
} from "@/lib/queries";
import { formatCost, formatDate, formatDuration, sumLlmCosts, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const type = str(sp.type) === "extraction" ? "extraction" : "validation";
  const q = str(sp.q);
  const page = Number(str(sp.page) ?? "1") || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          <Link
            href="/jobs"
            className={`rounded-md px-3 py-1 ${type === "validation" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Validation
          </Link>
          <Link
            href="/jobs?type=extraction"
            className={`rounded-md px-3 py-1 ${type === "extraction" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Extraction
          </Link>
        </div>
      </div>

      {type === "validation" ? (
        <ValidationJobs
          q={q}
          clientId={str(sp.clientId)}
          reportType={str(sp.reportType)}
          success={str(sp.success)}
          failCode={str(sp.failCode)}
          page={page}
        />
      ) : (
        <ExtractionJobs q={q} failedDiscoveryCode={str(sp.failedDiscoveryCode)} page={page} />
      )}
    </div>
  );
}

async function ValidationJobs(props: {
  q?: string;
  clientId?: string;
  reportType?: string;
  success?: string;
  failCode?: string;
  page: number;
}) {
  const [result, clientIds, failCodes] = await Promise.all([
    getValidationJobs(props),
    getClientIds(),
    getFailCodes(),
  ]);

  const params = {
    type: undefined,
    q: props.q,
    clientId: props.clientId,
    reportType: props.reportType,
    success: props.success,
    failCode: props.failCode,
  };

  return (
    <>
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Search (domain, URL, promotion id)</span>
          <input
            name="q"
            defaultValue={props.q ?? ""}
            className="w-64 rounded border border-slate-300 px-2 py-1.5"
            placeholder="e.g. bestbuy.com"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Client</span>
          <select name="clientId" defaultValue={props.clientId ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {clientIds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Report type</span>
          <select name="reportType" defaultValue={props.reportType ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="conclusion">conclusion</option>
            <option value="error">error</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Success</span>
          <select name="success" defaultValue={props.success ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="true">success</option>
            <option value="false">failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Fail code</span>
          <select name="failCode" defaultValue={props.failCode ?? ""} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">All</option>
            {failCodes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">Apply</button>
        <Link href="/jobs" className="py-1.5 text-slate-500 hover:text-slate-700">
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
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Fail codes</th>
              <th className="px-3 py-2">Reasoning</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((job) => (
              <tr key={String(job._id)} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  <Link href={`/jobs/validation/${job._id}`} className="text-sky-700 hover:underline">
                    {formatDate(job.createdAt)}
                  </Link>
                </td>
                <td className="px-3 py-2">{job.clientId ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{job.domain ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Badge variant={job.success ? "success" : "fail"}>
                      {job.success ? "success" : "failed"}
                    </Badge>
                    <Badge variant={job.reportType}>{job.reportType ?? "?"}</Badge>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex max-w-48 flex-wrap gap-1">
                    {(job.failCodes ?? []).map((c: string) => (
                      <Badge key={c} variant="code">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="min-w-80 max-w-md px-3 py-2 text-xs text-slate-600">
                  {truncate(job.reasoning, 140)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDuration(job.time)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatCost(sumLlmCosts(job.llmCosts))}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {job.screenshot ? (
                    <a href={job.screenshot} target="_blank" className="text-sky-700 hover:underline">
                      screenshot
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                  No validation jobs match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} basePath="/jobs" params={params} />
    </>
  );
}

async function ExtractionJobs(props: { q?: string; failedDiscoveryCode?: string; page: number }) {
  const [result, codes] = await Promise.all([getExtractionJobs(props), getFailedDiscoveryCodes()]);
  const params = { type: "extraction", q: props.q, failedDiscoveryCode: props.failedDiscoveryCode };

  return (
    <>
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <input type="hidden" name="type" value="extraction" />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Search (domain, URL)</span>
          <input
            name="q"
            defaultValue={props.q ?? ""}
            className="w-64 rounded border border-slate-300 px-2 py-1.5"
            placeholder="e.g. dominos.com"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Discovery failure</span>
          <select
            name="failedDiscoveryCode"
            defaultValue={props.failedDiscoveryCode ?? ""}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">All</option>
            {codes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700">Apply</button>
        <Link href="/jobs?type=extraction" className="py-1.5 text-slate-500 hover:text-slate-700">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Promotions found</th>
              <th className="px-3 py-2">Discovery failures</th>
              <th className="px-3 py-2">Reasoning</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((job) => (
              <tr key={String(job._id)} className="hover:bg-sky-50/50">
                <td className="whitespace-nowrap px-3 py-2">
                  <Link href={`/jobs/extraction/${job._id}`} className="text-sky-700 hover:underline">
                    {formatDate(job.createdAt)}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{job.domain ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={(job.promotionsFound?.length ?? 0) > 0 ? "success" : "unknown"}>
                    {job.promotionsFound?.length ?? 0}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(job.failedDiscoveryCodes ?? []).map((c: string) => (
                      <Badge key={c} variant="code">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="min-w-80 max-w-md px-3 py-2 text-xs text-slate-600">{truncate(job.reasoning, 140)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDuration(job.time)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatCost(job.llmCost?.totalCost)}</td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  No extraction jobs match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} basePath="/jobs" params={params} />
    </>
  );
}
