import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "type" || v == null) continue;
    params.set(k, Array.isArray(v) ? v[0] : v);
  }
  const dest = str(sp.type) === "csv" ? "/stats/client-files" : "/stats/bot-detection";
  redirect(params.size ? `${dest}?${params.toString()}` : dest);
}
