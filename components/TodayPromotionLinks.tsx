import Link from "next/link";
import { localValidationRunUrl } from "@/lib/local-validation-run";

export function PromotionIdLink({ id }: { id?: string }) {
  if (!id) return <span className="text-faint">—</span>;
  return (
    <Link href={`/promotions/${id}`} className="font-mono text-xs text-primary-ink hover:underline">
      {id}
    </Link>
  );
}

export function LocalValidateLink({ id }: { id?: string }) {
  if (!id) return <span className="text-faint">—</span>;
  return (
    <a
      href={localValidationRunUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      className="whitespace-nowrap text-xs text-primary-ink hover:underline"
    >
      Validate
    </a>
  );
}
