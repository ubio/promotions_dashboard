import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import { Section, KVGrid } from "@/components/Section";
import { requireClientSession } from "@/lib/auth";
import { getPortalPromotion } from "@/lib/portal";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { clientId } = await requireClientSession();
  const { id } = await params;
  const promotion = await getPortalPromotion(clientId, id);
  if (!promotion) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/portal/promotions" className="text-sm text-sky-700 hover:underline">
          ← Back to offers
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Offer</h1>
          {promotion.validityStatus ? (
            <Badge variant={promotion.validityStatus}>{promotion.validityStatus}</Badge>
          ) : (
            <Badge variant="unknown">validation issue</Badge>
          )}
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
              promotion.code ? <Badge key="c" variant="code">{promotion.code}</Badge> : "—",
            ],
            ["Expires", promotion.expirationDate],
            [
              "Discount",
              promotion.discountPercent
                ? `${promotion.discountPercent}%`
                : promotion.discountCurrency ?? "—",
            ],
            ["Last verified", promotion.createdAt ? formatDate(promotion.createdAt) : "—"],
          ]}
        />
      </Section>

      <Section title="Verification result">
        <KVGrid
          rows={[
            [
              "Validity",
              promotion.validityStatus ?? "—",
            ],
            [
              "Reason",
              promotion.reason !== "—" ? (
                <span key="reason" className="whitespace-pre-wrap">
                  {promotion.reason}
                </span>
              ) : (
                "—"
              ),
            ],
            ["What we found", promotion.finding],
            [
              "Evidence",
              promotion.screenshot ? (
                <a
                  key="s"
                  href={promotion.screenshot}
                  target="_blank"
                  className="text-sky-700 hover:underline"
                >
                  screenshot
                </a>
              ) : (
                "—"
              ),
            ],
          ]}
        />
      </Section>
    </div>
  );
}
