import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

// Legacy route: validation job rows are internal-only. Preserve old links by
// mapping them onto the promotion list with equivalent filters.
export default async function PortalValidationsRedirect({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();

  const days = str(sp.days);
  if (days) params.set("days", days);

  const domain = str(sp.domain);
  if (domain) params.set("domain", domain);

  const reason = str(sp.reason);
  if (reason) params.set("reason", reason);

  const page = str(sp.page);
  if (page) params.set("page", page);

  const outcome = str(sp.outcome);
  if (outcome === "worked") {
    params.set("outcome", "verified");
  } else if (outcome === "did_not_work") {
    params.set("outcome", "verified");
    params.set("finding", "issue");
  } else if (outcome === "incomplete") {
    params.set("outcome", "validation_issues");
  }

  const qs = params.toString();
  redirect(qs ? `/portal/promotions?${qs}` : "/portal/promotions");
}
