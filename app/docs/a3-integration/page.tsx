import { Diagram } from "@/components/docs/Diagram";
import a3IntegrationDiagram from "@/components/docs/diagrams/a3-integration";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

export default function A3IntegrationPage() {
  return (
    <>
      <DocHeader
        title="2. A3 integration"
        lead="A3 is the execution platform. It runs browser + LLM workflows on merchant sites."
      />

      <p>The A3 project defines two workflows:</p>
      <DocTable
        head={["Workflow", "Input", "Output (main fields)", "Webhook"]}
        rows={[
          [
            <code key="w">extract-promotions</code>,
            <>
              <code>source</code> (item URL, domain, country, merchant/product id)
            </>,
            <>
              <code>promotions[]</code>, <code>failedDiscoveryCodes</code>, <code>reasoning</code>,{" "}
              <code>llmCost</code>
            </>,
            <code key="h">POST /A3/jobFinished</code>,
          ],
          [
            <code key="w">validate-promotions</code>,
            <>
              <code>promotion</code> (URL, code, conditions, benefits, browser)
            </>,
            <>
              <code>outcome</code>, <code>success</code>, <code>failCodes</code>,{" "}
              <code>screenshotBase64</code>, prices, <code>promotionCorrection</code>, <code>llmCost</code>
            </>,
            <code key="h">POST /A3/validationFinished</code>,
          ],
        ]}
      />
      <p>
        Both webhooks fire on <code>success</code> and <code>failed</code>.
      </p>

      <h2>Job lifecycle (push model)</h2>
      <p>The API pushes work to A3, and A3 calls the API back when it finishes.</p>
      <Diagram svg={a3IntegrationDiagram} />

      <h2>Key points</h2>
      <ul>
        <li>
          <strong>Batching</strong>: each tick sends up to 200 extraction or 25 validation jobs
          and stops early when A3&apos;s queue is full.
        </li>
        <li>
          <strong>Locks</strong>: an item with a <code>lockId</code> is not picked again. The lock becomes
          the A3 <code>jobId</code> once the job is created.
        </li>
        <li>
          <strong>Idempotency</strong>:
          <ul>
            <li>
              Extraction key = source <code>uniqIndex</code>.
            </li>
            <li>
              Validation key = <code>promotionId:lockCount</code>.
            </li>
            <li>
              Webhooks ignore a <code>jobId</code> they have already stored.
            </li>
          </ul>
        </li>
        <li>
          <strong>Failed jobs</strong> still report <code>llmCost</code>, so billing stays complete.
        </li>
        <li>
          <strong>Merchant browser</strong>: the validation input carries the merchant&apos;s configured{" "}
          <code>browser</code>. A3 defaults to chromaton.
        </li>
      </ul>

      <h2>Older pull-style endpoints</h2>
      <p>
        The API also exposes <code>/Extraction/findNextExtractionSource</code>,{" "}
        <code>/Promotions/save</code>, <code>/Validation/findNextPromotion</code> and{" "}
        <code>/Validation/saveResult</code>. With these, a workflow pulls its next item and posts the
        result back. The enqueue + webhook flow above is the current path for both workflows.
      </p>
    </>
  );
}
