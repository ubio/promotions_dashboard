import Link from "next/link";
import { localValidationRunUrl } from "@/lib/local-validation-run";

export function PromotionIdLink({ id }: { id?: string }) {
  if (!id) return <span className="text-slate-400">—</span>;
  return (
    <Link href={`/promotions/${id}`} className="font-mono text-xs text-sky-700 hover:underline">
      {id}
    </Link>
  );
}

export function LocalValidateLink({ id }: { id?: string }) {
  if (!id) return <span className="text-slate-400">—</span>;
  return (
    <a
      href={localValidationRunUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      className="whitespace-nowrap text-xs text-sky-700 hover:underline"
    >
      Validate
    </a>
  );
}
