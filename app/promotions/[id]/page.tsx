import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import RawJson from "@/components/RawJson";
import { Section, KVGrid } from "@/components/Section";
import {
  getPromotion,
  getValidationsForPromotion,
  getExtractionJob,
  getMerchant,
} from "@/lib/queries";
import { formatDate, formatDuration, normalizeValidity, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

function objectRows(obj: Record<string, unknown> | undefined | null): [string, React.ReactNode][] {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotion = await getPromotion(id);
  if (!promotion) notFound();

  const [validations, extractionJob, merchant] = await Promise.all([
    getValidationsForPromotion(String(promotion._id), promotion.uniqId),
    promotion.extractionLogId ? getExtractionJob(promotion.extractionLogId) : null,
    promotion.merchantId ? getMerchant(promotion.merchantId) : null,
  ]);

  const status = normalizeValidity(promotion.validityStatus);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/promotions" className="text-sm text-sky-700 hover:underline">
          ← Back to promotions
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Promotion</h1>
          <code className="rounded bg-slate-200 px-2 py-0.5 text-xs">{String(promotion._id)}</code>
          <Badge variant={status}>{status}</Badge>
        </div>
      </div>

      <Section title="Overview">
        <KVGrid
          rows={[
            ["Client", promotion.clientId],
            ["Domain", promotion.domain],
            [
              "Merchant",
              merchant ? `${promotion.merchantId} (${merchant.domain})` : promotion.merchantId,
            ],
            ["Country", promotion.countryCode],
            ["Title", promotion.title],
            ["Description", promotion.description],
            ["Description (EN)", promotion.descriptionEn],
            ["Text on page", promotion.textOnPage],
            [
              "Source URL",
              promotion.sourceUrl ? (
                <a href={promotion.sourceUrl} target="_blank" className="text-sky-700 hover:underline break-all">
                  {promotion.sourceUrl}
                </a>
              ) : (
                "—"
              ),
            ],
            ["Uniq id", <code key="u" className="text-xs">{promotion.uniqId ?? "—"}</code>],
            ["Fingerprint", <code key="f" className="text-xs">{promotion.fingerprint ?? "—"}</code>],
            [
              "Client promotion ids",
              Array.isArray(promotion.clientPromotionId)
                ? `${promotion.clientPromotionId.length} linked`
                : "—",
            ],
            [
              "Extraction job",
              extractionJob ? (
                <Link
                  href={`/jobs/extraction/${extractionJob._id}`}
                  className="text-sky-700 hover:underline"
                >
                  {String(extractionJob._id)}
                </Link>
              ) : (
                promotion.extractionLogId ?? "—"
              ),
            ],
          ]}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Conditions">
          {objectRows(promotion.conditions).length > 0 ? (
            <KVGrid rows={objectRows(promotion.conditions)} />
          ) : (
            <p className="text-sm text-slate-400">No conditions recorded.</p>
          )}
        </Section>
        <Section title="Benefits">
          {objectRows(promotion.benefits).length > 0 ? (
            <KVGrid rows={objectRows(promotion.benefits)} />
          ) : (
            <p className="text-sm text-slate-400">No benefits recorded.</p>
          )}
        </Section>
      </div>

      <Section title="Applicability">
        {promotion.applicability ? (
          <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(promotion.applicability, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-400">No applicability data.</p>
        )}
      </Section>

      <Section title={`Validation history (${validations.length})`}>
        {validations.length === 0 ? (
          <p className="text-sm text-slate-400">No validation jobs recorded for this promotion.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Created</th>
                  <th className="py-1.5 pr-4">Result</th>
                  <th className="py-1.5 pr-4">Fail codes</th>
                  <th className="py-1.5 pr-4">Reasoning</th>
                  <th className="py-1.5 pr-4">Duration</th>
                  <th className="py-1.5 pr-4">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validations.map((v) => (
                  <tr key={String(v._id)}>
                    <td className="whitespace-nowrap py-1.5 pr-4">
                      <Link href={`/jobs/validation/${v._id}`} className="text-sky-700 hover:underline">
                        {formatDate(v.createdAt)}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-4">
                      <div className="flex gap-1">
                        <Badge variant={v.success ? "success" : "fail"}>{v.success ? "success" : "failed"}</Badge>
                        <Badge variant={v.reportType}>{v.reportType}</Badge>
                      </div>
                    </td>
                    <td className="py-1.5 pr-4">
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {(v.failCodes ?? []).map((c: string) => (
                          <Badge key={c} variant="code">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="min-w-72 max-w-md py-1.5 pr-4 text-xs text-slate-600">{truncate(v.reasoning, 120)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-4">{formatDuration(v.time)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-4 text-xs">
                      {v.screenshot ? (
                        <a href={v.screenshot} target="_blank" className="text-sky-700 hover:underline">
                          screenshot
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {promotion.systemMeta && (
        <Section title="System metadata">
          <KVGrid rows={objectRows(promotion.systemMeta)} />
        </Section>
      )}

      <RawJson data={promotion} />
    </div>
  );
}
