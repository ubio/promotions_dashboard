import Link from "next/link";
import { Diagram } from "@/components/docs/Diagram";
import { Callout, DocHeader, DocTable } from "@/components/docs/DocParts";

const DATA_FLOW = `
flowchart LR
    U[Internal user] -->|Google sign-in| D[Dashboard]
    C[Client user] -->|Google sign-in<br/>client allowlist| P[Client portal /portal]
    P --- D
    D -->|read| DB[(MongoDB<br/>latestPromotions · validationLogs ·<br/>extractionLogs · merchants · stats)]
    D -->|"Ops endpoints + OPS_SECRET"| API[promotions-service]
    API --> DB
    L[Lens] -->|bearer token| F["/api/lens/validations<br/>daily counts only"]
    F --> D
`;

export default function DashboardDocPage() {
  return (
    <>
      <DocHeader
        title="6. Dashboard"
        lead={
          <>
            This app, at <code>dashboard.promotions.automation.cloud</code>. It does not own data.
          </>
        }
      />

      <ul>
        <li>
          <strong>Reads</strong> go straight to MongoDB (read-only, secondary preferred).
        </li>
        <li>
          <strong>Writes / actions</strong> go to the API Ops endpoints with <code>OPS_SECRET</code>.
        </li>
      </ul>
      <Diagram chart={DATA_FLOW} />

      <h2>Sections</h2>
      <DocTable
        head={["Route", "Shows"]}
        rows={[
          [<code key="r">/jobs</code>, "Extraction and validation job runs: evidence, reasoning, screenshots"],
          [
            <Link key="r" href="/promotions/extracted">
              <code>/promotions</code>
            </Link>,
            "Promotions and extracted promotions with their validity",
          ],
          [
            <Link key="r" href="/validations/runs">
              <code>/validations/runs</code>
            </Link>,
            "Validation runs, restart validations",
          ],
          [
            <Link key="r" href="/stats/clients">
              <code>/stats</code>
            </Link>,
            "Per-client and per-merchant daily stats, bot detection, failing scripts",
          ],
          [
            <Link key="r" href="/reports">
              <code>/reports</code>
            </Link>,
            "Summary and validation reports (CSV export)",
          ],
          [<code key="r">/events</code>, "Client CSV import events, bot-detection events"],
          [
            <Link key="r" href="/billing/google">
              <code>/billing/google</code>
            </Link>,
            "Google job counts and LLM cost",
          ],
          [
            <Link key="r" href="/portal/preview">
              <code>/portal</code>
            </Link>,
            "Client-facing view, scoped to the user's client",
          ],
        ]}
      />

      <h2>Ops actions (UI → API)</h2>
      <DocTable
        head={["UI action", "API endpoint"]}
        rows={[
          ["Export spreadsheets", <code key="e">POST /Ops/exportSpreadsheets</code>],
          [
            "Reset validations (bulk / single)",
            <>
              <code>/Ops/resetNonClientFacingValidations[...]</code>, <code>/Ops/resetValidation</code>
            </>,
          ],
          [
            "Mark merchant bot-detected / fixed",
            <>
              <code>/Ops/merchants/markBotDetected</code>, <code>/Ops/merchants/markBotDetectionFixed</code>
            </>,
          ],
        ]}
      />

      <Callout>
        Rule of thumb: new data or behaviour goes into the API first. The dashboard only displays it or
        triggers it.
      </Callout>
    </>
  );
}
