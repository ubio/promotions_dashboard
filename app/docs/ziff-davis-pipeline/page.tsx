import { Diagram } from "@/components/docs/Diagram";
import { DocHeader } from "@/components/docs/DocParts";

const PIPELINE = `
flowchart LR
    S3[(ZD S3 bucket<br/>request/)] -->|ImportFilesListForZDTask| ZS[(zdSources)]
    ZS -->|ImportPromotionsForZDTask| CR[(clientPromotionRecords)]
    CR -->|ConvertPromotionsTask<br/>+ LLM fills gaps| TP[(todayPromotions<br/>+ promotions)]
    TP -->|EnqueuePromotionValidationTask| VA[A3 validate-promotions]
    VA -->|/A3/validationFinished| VL[(validationLogs)]
    VL -->|verdict| TP
    TP -->|ExportPromotionsToAwsBucketTask| OUT[(ZD S3 bucket<br/>results)]
    ZS -.->|Slack notify| SL[Slack]
`;

export default function ZiffDavisPipelinePage() {
  return (
    <>
      <DocHeader
        title="4. Ziff Davis pipeline"
        lead="Ziff Davis provides promotions they already know about. We convert them into Ubio promotions, validate them, and export the results back. There is no extraction step."
      />

      <p>
        ZD files come in two types: <strong>site-wide</strong> and <strong>SKU-specific</strong>{" "}
        promotions.
      </p>
      <Diagram chart={PIPELINE} />

      <h2>Steps</h2>
      <ol>
        <li>
          <strong>Discover files</strong>: list the S3 folder and register new files in{" "}
          <code>zdSources</code> (bundle id comes from the file name).
        </li>
        <li>
          <strong>Import</strong>: lock one file at a time, store its rows as{" "}
          <code>clientPromotionRecords</code>, and post a notification to Slack.
        </li>
        <li>
          <strong>Convert</strong>: map each record to a Ubio <code>Promotion</code>. An LLM fills in
          missing conditions and benefits. Conversion:
          <ul>
            <li>reuses an existing promotion with the same fingerprint, when there is one;</li>
            <li>
              adds locks that keep a promotion out of validation, e.g. merchant not automatable or
              validation not allowed.
            </li>
          </ul>
          Enabled by <code>FEATURE_CLIENT_PROMOTIONS_CONVERTER_ENABLED</code>.
        </li>
        <li>
          <strong>Validate</strong>: the shared validation flow.
        </li>
        <li>
          <strong>Export</strong>: write validated results back to S3 (
          <code>FEATURE_PROMOTIONS_TO_AWS_BUCKET_EXPORTER_ENABLED</code>).{" "}
          <code>WarnZdExportGapTask</code> raises an alert when exports stop.
        </li>
      </ol>
    </>
  );
}
