import { Diagram } from "@/components/docs/Diagram";
import architectureDiagram from "@/components/docs/diagrams/architecture";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

export default function ArchitecturePage() {
  return (
    <>
      <DocHeader title="1. Architecture" lead="How the API is built and where data lives." />

      <h2>promotions-service (API)</h2>
      <p>One Node.js process with two halves:</p>
      <ul>
        <li>
          <strong>HTTP API</strong>: A3 webhooks, Ops endpoints for the dashboard, and the merchant,
          extraction and validation endpoints.
        </li>
        <li>
          <strong>Periodic tasks</strong>: import, convert, enqueue A3 jobs, export, refresh stats.
        </li>
      </ul>
      <Diagram svg={architectureDiagram} />

      <h3>Main periodic tasks</h3>
      <DocTable
        head={["Purpose", "Interval"]}
        rows={[
          ["Google: pull source bundles from GCS", "15 min"],
          [
            <>
              Google: send sources to A3 <code>extract-promotions</code>
            </>,
            "1 min",
          ],
          ["Google: export results to GCS", "1 h"],
          ["Google: export data reports to GCS", "30 min"],
          ["ZD: find new S3 files", "1 h"],
          ["ZD: import rows from new files", "15 min"],
          ["ZD: client record → Ubio promotion (LLM fills gaps)", "100 ms"],
          ["ZD: export results to S3", "15 min"],
          ["ZD: alert when exports stop", "2 h"],
          [
            <>
              All clients: send promotions to A3 <code>validate-promotions</code>
            </>,
            "1 min",
          ],
          ["Re-queue validations that failed for internal reasons", "15 min"],
          ["Pre-aggregated stats for the dashboard", "15 min"],
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
    </>
  );
}
