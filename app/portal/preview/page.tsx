import Link from "next/link";
import { requireInternalSession } from "@/lib/auth";
import { getReportClientIds } from "@/lib/reports";

export const dynamic = "force-dynamic";

// Internal-only: choose which client's portal to preview.
export default async function PortalPreviewPicker() {
  await requireInternalSession();
  const clients = await getReportClientIds();

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <div>
        <h1 className="text-xl font-semibold">Preview the client view</h1>
        <p className="mt-1 text-sm text-slate-500">
          See the portal exactly as a client sees it. This is read-only and changes nothing for
          them.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2">
        {clients.length === 0 ? (
          <p className="p-3 text-sm text-slate-400">No clients found.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clients.map((c) => (
              <li key={c}>
                <a
                  href={`/api/view-as?clientId=${encodeURIComponent(c)}`}
                  className="flex items-center justify-between gap-3 rounded px-3 py-2.5 text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{c}</span>
                  <span className="text-xs text-sky-700">View as →</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/" className="inline-block text-sm text-sky-700 hover:underline">
        ← Back to the internal dashboard
      </Link>
    </div>
  );
}
