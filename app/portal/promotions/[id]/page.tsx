import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import { Section, KVGrid } from "@/components/Section";
import { requireClientSession } from "@/lib/auth";
import { getPromotion, getValidationsForPromotion } from "@/lib/queries";
import { formatDate, normalizeValidity, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { clientId } = await requireClientSession();
  const { id } = await params;
  const promotion = await getPromotion(id);
  // Scope check: a client must never see another client's promotion.
  if (!promotion || promotion.clientId !== clientId) notFound();

  const validations = await getValidationsForPromotion(String(promotion._id), promotion.uniqId, {
    conclusionsOnly: true,
  });

  const status = normalizeValidity(promotion.validityStatus);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/portal/promotions" className="text-sm text-sky-700 hover:underline">
          ← Back to promotions
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Promotion</h1>
          <Badge variant={status}>{status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <Section title="Overview">
        <KVGrid
          rows={[
            ["Domain", promotion.domain],
            ["Country", promotion.countryCode],
            ["Title", promotion.title],
            ["Description", promotion.description],
            [
              "Source URL",
              promotion.sourceUrl ? (
                <a
                  href={promotion.sourceUrl}
                  target="_blank"
                  className="text-sky-700 hover:underline break-all"
                >
                  {promotion.sourceUrl}
                </a>
              ) : (
                "—"
              ),
            ],
            [
              "Promo code",
              promotion.conditions?.code ? <Badge key="c" variant="code">{promotion.conditions.code}</Badge> : "—",
            ],
            ["Expires", promotion.conditions?.expirationDate],
            [
              "Discount",
              promotion.benefits?.discountPercent
                ? `${promotion.benefits.discountPercent}%`
                : promotion.benefits?.discountCurrency
                  ? String(promotion.benefits.discountCurrency)
                  : "—",
            ],
          ]}
        />
      </Section>

      <Section title={`Validation history (${validations.length})`}>
        {validations.length === 0 ? (
          <p className="text-sm text-slate-400">No completed validations for this promotion yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4">Date</th>
                  <th className="py-1.5 pr-4">Outcome</th>
                  <th className="py-1.5 pr-4">Reason codes</th>
                  <th className="py-1.5 pr-4">Detail</th>
                  <th className="py-1.5 pr-4">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validations.map((v) => (
                  <tr key={String(v._id)}>
                    <td className="whitespace-nowrap py-1.5 pr-4 text-slate-600">
                      {formatDate(v.createdAt)}
                    </td>
                    <td className="py-1.5 pr-4">
                      <Badge variant={v.success ? "success" : "fail"}>
                        {v.success ? "worked" : "did not work"}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-4">
                      <div className="flex min-w-36 max-w-52 flex-wrap gap-1">
                        {(v.failCodes ?? []).map((c: string) => (
                          <Badge key={c} variant="code">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="min-w-72 max-w-md py-1.5 pr-4 text-xs text-slate-600">
                      {truncate(v.reasoning, 160)}
                    </td>
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
    </div>
  );
}
