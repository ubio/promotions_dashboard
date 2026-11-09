import Link from "next/link";
import { Diagram } from "@/components/docs/Diagram";
import { DocHeader } from "@/components/docs/DocParts";

const PIPELINE = `
flowchart LR
    GCS[(Google GCS<br/>source bundles)] -->|ImportPromotionSourcesTask| PS[(promotionSources)]
    PS -->|EnqueuePromotionExtractionTask| EX[A3 extract-promotions]
    EX -->|/A3/jobFinished| EL[(extractionLogs)]
    EX -->|promotions found| TP[(todayPromotions<br/>+ promotions)]
    TP -->|EnqueuePromotionValidationTask| VA[A3 validate-promotions]
    VA -->|/A3/validationFinished| VL[(validationLogs)]
    VL -->|verdict| TP
    TP -->|ExportPromotionsToBucketTask| OUT[(Google GCS<br/>results CSV)]
    TP -->|ExportDataReportsTask| REP[(Transformation reports)]
`;

export default function GooglePipelinePage() {
  return (
    <>
      <DocHeader
        title="3. Google pipeline"
        lead="Google provides product URLs. We extract the promotions from each page, validate them, and export the results back to Google."
      />

      <p>
        Enabled by <code>FEATURE_GOOGLE_HANDLERS_ENABLED</code> (import + extraction) and{" "}
        <code>FEATURE_GOOGLE_EXPORT_ENABLED</code> (export). Locales come from <code>LOCALES</code>{" "}
        (default <code>de_DE,fr_FR,ja_JP</code>).
      </p>
      <Diagram chart={PIPELINE} />

      <h2>Steps</h2>
      <ol>
        <li>
          <strong>Import</strong>: read new bundles per locale from GCS and store one{" "}
          <code>promotionSource</code> per product URL.
        </li>
        <li>
          <strong>Extract</strong>: queue each unlocked source as an A3 extraction job.
        </li>
        <li>
          <strong>Store extraction</strong>: the webhook writes an <code>extractionLog</code>. Every
          promotion found goes into <code>todayPromotions</code> and <code>promotions</code> (origin =
          Extraction). An empty result carries a <code>failedDiscoveryCode</code>:{" "}
          <code>BOT_DETECTION</code>, <code>SITE_ISSUES</code>, <code>NO_PROMOTIONS_FOUND</code> or{" "}
          <code>LLM_COST_LIMIT</code>.
        </li>
        <li>
          <strong>Validate</strong>: the shared validation flow (see{" "}
          <Link href="/docs/a3-integration">A3 integration</Link> and{" "}
          <Link href="/docs/validation-verdict">Validation verdict</Link>).
        </li>
        <li>
          <strong>Export</strong>: group results per bundle and country, then upload a CSV to the Google
          bucket. Data reports are exported as well.
        </li>
        <li>
          <strong>Billing</strong>: <code>googleDailyStats</code> aggregates jobs and LLM cost, which the
          dashboard shows on <Link href="/billing/google">Google billing</Link>.
        </li>
      </ol>
    </>
  );
}
