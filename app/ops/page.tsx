import ExtractionControls from "@/components/ops/ExtractionControls";
import { requireInternalSession } from "@/lib/auth";
import { OpsClient, type ExtractionStatus } from "@/lib/ops-client";
import { isOpsConfigured } from "@/lib/ops-config";

export const dynamic = "force-dynamic";

async function loadExtractionStatus(): Promise<ExtractionStatus | null> {
  if (!isOpsConfigured()) return null;
  try {
    return await OpsClient.fromEnv().extractionStatus();
  } catch {
    return null;
  }
}

export default async function OpsPage() {
  await requireInternalSession();
  const status = await loadExtractionStatus();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ops</h1>
        <p className="text-sm text-muted">
          Controls over the pipelines. Each button asks for confirmation before it changes anything.
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
        <ExtractionControls initialStatus={status} />
      )}
    </div>
  );
}
