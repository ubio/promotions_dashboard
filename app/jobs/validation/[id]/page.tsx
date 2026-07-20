import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import RawJson from "@/components/RawJson";
import { Section, KVGrid } from "@/components/Section";
import { getValidationJob, getPromotion, getPromotionByUniqId } from "@/lib/queries";
import { formatDate, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ValidationJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getValidationJob(id);
  if (!job) notFound();

  const promotion = job.promotionId
    ? ((await getPromotion(job.promotionId)) ??
      (job.promotionUniqId ? await getPromotionByUniqId(job.promotionUniqId) : null))
    : null;

  const llmCosts: Record<string, unknown>[] = job.llmCosts ?? [];
  const totalLlmCost = llmCosts.reduce((s, c) => s + (Number(c.totalCost) || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/jobs" className="text-sm text-sky-700 hover:underline">
          ← Back to jobs
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Validation job</h1>
          <code className="rounded bg-slate-200 px-2 py-0.5 text-xs">{String(job._id)}</code>
          <Badge variant={job.success ? "success" : "fail"}>{job.success ? "success" : "failed"}</Badge>
          <Badge variant={job.reportType}>{job.reportType}</Badge>
        </div>
      </div>

      <Section title="Overview">
        <KVGrid
          rows={[
            ["Created", formatDate(job.createdAt)],
            ["Duration", formatDuration(job.time)],
            ["Client", job.clientId],
            ["Domain", job.domain],
            ["Country", job.countryCode],
            [
              "Source URL",
              job.sourceUrl ? (
                <a href={job.sourceUrl} target="_blank" className="text-sky-700 hover:underline break-all">
                  {job.sourceUrl}
                </a>
              ) : (
                "—"
              ),
            ],
            ["Import bundle", job.importBundle],
            [
              "Promotion",
              job.promotionId ? (
                <Link href={`/promotions/${job.promotionId}`} className="text-sky-700 hover:underline">
                  {job.promotionId}
                </Link>
              ) : (
                "—"
              ),
            ],
            ["Promotion uniq id", <code key="u" className="text-xs">{job.promotionUniqId ?? "—"}</code>],
            ["Exported to BigQuery", String(job.exportedToBigQuery ?? "—")],
          ]}
        />
      </Section>

      <Section title="Result & reasoning">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(job.failCodes ?? []).map((c: string) => (
              <Badge key={c} variant="code">
                {c}
              </Badge>
            ))}
            {(job.failCodes ?? []).length === 0 && <span className="text-sm text-slate-400">No fail codes</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{job.reasoning || "No reasoning recorded."}</p>
        </div>
      </Section>

      {promotion && (
        <Section title="Promotion under validation">
          <KVGrid
            rows={[
              ["Description", promotion.description],
              ["Promo code", promotion.conditions?.code ? <code key="c">{promotion.conditions.code}</code> : "—"],
              ["Merchant", promotion.merchantId],
              ["Validity status", promotion.validityStatus],
            ]}
          />
          <Link href={`/promotions/${promotion._id}`} className="mt-3 inline-block text-sm text-sky-700 hover:underline">
            View full promotion →
          </Link>
        </Section>
      )}

      <Section title="Evidence">
        <div className="space-y-3">
          {job.screenshot ? (
            <div>
              <a href={job.screenshot} target="_blank" className="text-sm text-sky-700 hover:underline">
                Open screenshot in new tab ↗
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={job.screenshot}
                alt="Validation screenshot"
                className="mt-2 max-h-[600px] rounded border border-slate-200"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">No screenshot.</p>
          )}
          {job.video ? (
            <a href={job.video} target="_blank" className="block text-sm text-sky-700 hover:underline">
              Open video recording ↗
            </a>
          ) : (
            <p className="text-sm text-slate-400">No video.</p>
          )}
        </div>
      </Section>

      <Section title={`LLM costs${totalLlmCost ? ` — $${totalLlmCost.toFixed(4)} total` : ""}`}>
        {llmCosts.length === 0 ? (
          <p className="text-sm text-slate-400">No LLM cost records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-4">Model</th>
                  <th className="py-1 pr-4">Input</th>
                  <th className="py-1 pr-4">Output</th>
                  <th className="py-1 pr-4">Cache read</th>
                  <th className="py-1 pr-4">Cache write</th>
                  <th className="py-1 pr-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {llmCosts.map((c, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4 font-mono text-xs">{String(c.model ?? "?")}</td>
                    <td className="py-1 pr-4">${Number(c.inputCost ?? 0).toFixed(4)}</td>
                    <td className="py-1 pr-4">${Number(c.outputCost ?? 0).toFixed(4)}</td>
                    <td className="py-1 pr-4">${Number(c.cacheReadCost ?? 0).toFixed(4)}</td>
                    <td className="py-1 pr-4">${Number(c.cacheWriteCost ?? 0).toFixed(4)}</td>
                    <td className="py-1 pr-4 font-medium">${Number(c.totalCost ?? 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {(job.llmLogs ?? []).length > 0 && <RawJson data={job.llmLogs} label={`LLM logs (${job.llmLogs.length})`} />}

      <RawJson data={job} />
    </div>
  );
}
