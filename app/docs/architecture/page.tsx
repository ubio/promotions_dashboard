import { Diagram } from "@/components/docs/Diagram";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

const API_SHAPE = `
flowchart TB
    subgraph API[promotions-service]
        direction TB
        R[Routers<br/>A3Webhook · Ops · Merchant ·<br/>Extraction · Validation]
        T[Periodic tasks<br/>import · convert · enqueue ·<br/>export · stats]
        S[Services]
        ST[Storage classes]
        R --> S
        T --> S
        S --> ST
    end
    ST --> DB[(MongoDB)]
    S --> A3[A3 Job API]
    S --> EXT[(GCS · S3 · BigQuery · Sheets · Slack)]
`;

export default function ArchitecturePage() {
  return (
    <>
      <DocHeader title="1. Architecture" lead="How the API is built, where data lives, and how the parts authenticate." />

      <h2>promotions-service (API)</h2>
      <p>One Node.js process with two halves:</p>
      <ul>
        <li>
          <strong>HTTP API</strong>: A3 webhooks, Ops endpoints for the dashboard, and the merchant,
          extraction and validation endpoints.
        </li>
        <li>
          <strong>Periodic tasks</strong> (enabled by <code>RUN_TASKS_ON_START</code>, and per-feature
          flags): import, convert, enqueue A3 jobs, export, refresh stats.
        </li>
      </ul>
      <Diagram chart={API_SHAPE} />

      <h3>Main periodic tasks</h3>
      <DocTable
        head={["Task", "Default interval", "Purpose"]}
        rows={[
          [<code key="t">ImportPromotionSourcesTask</code>, "15 min", "Google: pull source bundles from GCS"],
          [
            <code key="t">EnqueuePromotionExtractionTask</code>,
            "1 min",
            <>
              Google: send sources to A3 <code>extract-promotions</code>
            </>,
          ],
          [
            <>
              <code>ImportFilesListForZDTask</code> / <code>ImportPromotionsForZDTask</code>
            </>,
            "1 h / 15 min",
            "ZD: find new S3 files, import rows",
          ],
          [<code key="t">ConvertPromotionsTask</code>, "1 min", "ZD: client record → Ubio promotion (LLM fills gaps)"],
          [
            <code key="t">EnqueuePromotionValidationTask</code>,
            "1 min",
            <>
              All clients: send promotions to A3 <code>validate-promotions</code>
            </>,
          ],
          [
            <code key="t">RetryInternalValidationFailuresTask</code>,
            "15 min",
            "Re-queue validations that failed for internal reasons",
          ],
          [<code key="t">ExportPromotionsToBucketTask</code>, "1 h", "Google: export results to GCS"],
          [<code key="t">ExportPromotionsToAwsBucketTask</code>, "12 h", "ZD: export results to S3"],
          [
            <>
              <code>Export*ToBQTask</code>, <code>Export*ToSheetTask</code>
            </>,
            "15 min – 1 day",
            "Analytics / debugging exports",
          ],
          [<code key="t">RefreshDailyStatsTask</code>, "15 min", "Pre-aggregated stats for the dashboard"],
        ]}
      />

      <h2>Data stores (MongoDB Promotions DB)</h2>
      <DocTable
        head={["Collection", "Holds"]}
        rows={[
          [<code key="c">promotionSources</code>, "Google product URLs to extract (with lock)"],
          [
            <>
              <code>clientPromotionRecords</code> / <code>zdSources</code>
            </>,
            "ZD raw rows / imported S3 files",
          ],
          [<code key="c">todayPromotions</code>, "Working set of promotions to validate (TTL 1 day, holds the lock)"],
          [
            <code key="c">latestPromotions</code>,
            <>
              Mirror of <code>todayPromotions</code> kept 30 days (used by the dashboard)
            </>,
          ],
          [
            <code key="c">promotions</code>,
            <>
              Long-lived promotion entity by <code>uniqId</code>, latest verdict
            </>,
          ],
          [
            <>
              <code>extractionLogs</code> / <code>validationLogs</code>
            </>,
            "One record per A3 job result",
          ],
          [
            <>
              <code>merchants</code>, <code>merchantBotDetectionEvents</code>
            </>,
            "Merchant settings (browser, bot detection)",
          ],
          [
            <>
              <code>googleDailyStats</code>, <code>ziffDavisDailyStats</code>, <code>clientCsvEvents</code>
            </>,
            "Stats and events for the dashboard",
          ],
        ]}
      />

      <h2>Security between parts</h2>
      <DocTable
        head={["Link", "Auth"]}
        rows={[
          [
            <>
              API → A3 <code>createJob</code>
            </>,
            <>
              Bearer <code>A3_API_TOKEN</code>
            </>,
          ],
          [
            "A3 → API webhooks",
            <>
              HMAC signature in <code>x-a3-signature</code> over the raw body
            </>,
          ],
          [
            "Dashboard → API Ops",
            <>
              Shared <code>OPS_SECRET</code>
            </>,
          ],
          ["User → Dashboard", "Google sign-in (internal domains or client-portal allowlist)"],
          [
            "Lens → Dashboard feed",
            <>
              Bearer <code>LENS_FEED_TOKEN</code>
            </>,
          ],
        ]}
      />
    </>
  );
}
