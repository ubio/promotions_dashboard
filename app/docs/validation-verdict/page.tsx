import { Diagram } from "@/components/docs/Diagram";
import validationVerdictDiagram from "@/components/docs/diagrams/validation-verdict";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

export default function ValidationVerdictPage() {
  return (
    <>
      <DocHeader
        title="5. Validation verdict"
        lead={
          <>
            Every A3 validation result becomes one <code>validationLog</code>. The promotion&apos;s
            verdict is then recalculated from all of its logs.
          </>
        }
      />

      <h2>What A3 reports</h2>
      <DocTable
        head={["outcome", "Meaning"]}
        rows={[
          [
            <code key="o">concluded</code>,
            <>
              Offer was applied. <code>success</code> says whether the benefit landed
            </>,
          ],
          [<code key="o">bot_blocked</code>, "Anti-bot wall"],
          [
            <>
              <code>page_missing</code> / <code>page_error</code>
            </>,
            "Page unusable",
          ],
          [<code key="o">out_of_stock</code>, "Product could not be bought"],
        ]}
      />
      <p>
        A concluded run is logged as <code>reportType = conclusion</code>. Anything else, including a
        failed job, is logged as <code>reportType = error</code> (e.g. fail code <code>A3_ERROR</code>).
      </p>

      <h2>Verdict rules</h2>
      <p>
        All logs for the promotion are counted. <strong>N</strong> is{" "}
        <code>VALIDATION_NEEDED_FOR_CONCLUSION</code> and <strong>MAX</strong> is{" "}
        <code>MAX_VALIDATIONS_PER_PROMOTION</code>. Successes and fails count conclusions only, while
        the total counts every log, errors included.
      </p>
      <Diagram svg={validationVerdictDiagram} />
      <ul>
        <li>
          The verdict is written to <code>todayPromotions</code>, <code>latestPromotions</code> and{" "}
          <code>promotions</code>, along with <code>latestValidation</code>.
        </li>
        <li>
          Promotions with <code>runValidation = true</code> are picked up by the next enqueue tick.
        </li>
        <li>
          Internal failures are retried by <code>RetryInternalValidationFailuresTask</code>.
        </li>
        <li>
          Ops can force a re-run from the dashboard with <strong>Reset validation</strong>.
        </li>
        <li>
          <strong>Bot detection</strong>:
          <ul>
            <li>
              A <code>BOT_DETECTION</code> fail first makes the next attempt use a different browser.
            </li>
            <li>
              After <code>MAX_BOT_DETECTION_BEFORE_MARKING</code> hits, the merchant is marked
              bot-detected and its pending promotions are suspended. The event goes to{" "}
              <code>merchantBotDetectionEvents</code>.
            </li>
            <li>
              Ops lifts the suspension with <strong>Mark bot detection fixed</strong>.
            </li>
          </ul>
        </li>
      </ul>
    </>
  );
}
