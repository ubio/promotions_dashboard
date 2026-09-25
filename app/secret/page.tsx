import OpsPanel from "@/components/ops/OpsPanel";
import { requireInternalSession } from "@/lib/auth";
import { OpsClient, type ResetCandidatesPage } from "@/lib/ops-client";
import { isOpsConfigured } from "@/lib/ops-config";

export const dynamic = "force-dynamic";

const INITIAL_PAGE_SIZE = 25;

async function loadInitialCandidates(): Promise<ResetCandidatesPage | null> {
  if (!isOpsConfigured()) return null;
  try {
    return await OpsClient.fromEnv().listResetCandidates(1, INITIAL_PAGE_SIZE);
  } catch {
    return null;
  }
}

export default async function SecretOpsPage() {
  await requireInternalSession();
  const initialCandidates = await loadInitialCandidates();

  return (
    <div data-full-width className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ops</h1>
        <p className="text-sm text-muted">
          On-demand operations for the promotions pipeline. This page is not linked anywhere — bookmark the URL if you
          need it again.
        </p>
      </div>

      {!isOpsConfigured() ? (
        <div className="rounded-lg border border-warn-line bg-warn-bg p-4 text-sm text-warn">
          <p className="font-medium">Ops is not fully configured.</p>
          <p className="mt-1">
            Set <code className="rounded bg-warn-bg px-1">PROMOTIONS_SERVICE_URL</code> and{" "}
            <code className="rounded bg-warn-bg px-1">OPS_SECRET</code> in the environment (same{" "}
            <code className="rounded bg-warn-bg px-1">OPS_SECRET</code> as on promotions-service).
          </p>
        </div>
      ) : (
        <OpsPanel initialCandidates={initialCandidates} />
      )}
    </div>
  );
}
