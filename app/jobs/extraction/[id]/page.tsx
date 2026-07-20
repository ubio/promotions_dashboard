import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import RawJson from "@/components/RawJson";
import { Section, KVGrid } from "@/components/Section";
import { getExtractionJob } from "@/lib/queries";
import { formatDate, formatDuration, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExtractionJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getExtractionJob(id);
  if (!job) notFound();

  const found: Record<string, unknown>[] = job.promotionsFound ?? [];
  const visited: string[] = job.visitedUrls ?? [];
  const visitReasoning: string[] = job.visitReasoning ?? [];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/jobs?type=extraction" className="text-sm text-sky-700 hover:underline">
          ← Back to extraction jobs
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Extraction job</h1>
          <code className="rounded bg-slate-200 px-2 py-0.5 text-xs">{String(job._id)}</code>
          <Badge variant={found.length > 0 ? "success" : "unknown"}>
            {found.length} promotion{found.length === 1 ? "" : "s"} found
          </Badge>
        </div>
      </div>

      <Section title="Overview">
        <KVGrid
          rows={[
            ["Created", formatDate(job.createdAt)],
            ["Duration", formatDuration(job.time)],
            ["Domain", job.domain],
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
            [
              "Discovery failures",
              (job.failedDiscoveryCodes ?? []).length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {job.failedDiscoveryCodes.map((c: string) => (
                    <Badge key={c} variant="code">
                      {c}
                    </Badge>
                  ))}
                </span>
              ) : (
                "None"
              ),
            ],
            ["LLM cost", job.llmCost?.totalCost != null ? `$${Number(job.llmCost.totalCost).toFixed(4)}` : "—"],
          ]}
        />
      </Section>

      <Section title="Reasoning">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{job.reasoning || "No reasoning recorded."}</p>
      </Section>

      <Section title={`Visited URLs (${visited.length})`}>
        {visited.length === 0 ? (
          <p className="text-sm text-slate-400">No visited URLs recorded.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {visited.map((url, i) => (
              <li key={i} className="rounded border border-slate-100 bg-slate-50 p-2">
                <a href={url} target="_blank" className="break-all font-mono text-xs text-sky-700 hover:underline">
                  {url}
                </a>
                {visitReasoning[i] && <p className="mt-1 text-xs text-slate-600">{visitReasoning[i]}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={`Promotions found (${found.length})`}>
        {found.length === 0 ? (
          <p className="text-sm text-slate-400">No promotions were extracted by this job.</p>
        ) : (
          <div className="space-y-3">
            {found.map((p, i) => (
              <div key={i} className="rounded border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{truncate(String(p.title || p.description || "Untitled"), 100)}</span>
                  {(p as { conditions?: { code?: string } }).conditions?.code && (
                    <Badge variant="code">{(p as { conditions?: { code?: string } }).conditions!.code}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  uniqId: <code>{String(p.uniqId ?? "—")}</code>
                  {p.uniqId != null && (
                    <>
                      {" · "}
                      <Link href={`/promotions?q=${p.uniqId}`} className="text-sky-700 hover:underline">
                        find in promotions →
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <RawJson data={job} />
    </div>
  );
}
