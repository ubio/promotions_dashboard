import OpsPanel from "@/components/ops/OpsPanel";
import { requireInternalSession } from "@/lib/auth";
import { isOpsConfigured } from "@/lib/ops-config";

export const dynamic = "force-dynamic";

export default async function SecretOpsPage() {
  await requireInternalSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ops</h1>
        <p className="text-sm text-slate-500">
          On-demand operations for the promotions pipeline. This page is not linked anywhere — bookmark the URL if you
          need it again.
        </p>
      </div>

      {!isOpsConfigured() ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Ops is not fully configured.</p>
          <p className="mt-1">
            Set <code className="rounded bg-amber-100 px-1">PROMOTIONS_SERVICE_URL</code> and{" "}
            <code className="rounded bg-amber-100 px-1">OPS_SECRET</code> in the environment (same{" "}
            <code className="rounded bg-amber-100 px-1">OPS_SECRET</code> as on promotions-service).
          </p>
        </div>
      ) : (
        <OpsPanel />
      )}
    </div>
  );
}
