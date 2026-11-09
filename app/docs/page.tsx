import Link from "next/link";
import { Diagram } from "@/components/docs/Diagram";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

const OVERVIEW = `
flowchart LR
    subgraph Clients
        G[(Google GCS bucket)]
        ZD[(Ziff Davis S3 bucket)]
    end

    API[promotions-service<br/>API + periodic tasks]
    DB[(MongoDB<br/>Promotions DB)]
    A3[A3 platform<br/>extract / validate workflows]
    UI[promotions_dashboard<br/>Next.js]
    BQ[(BigQuery / Sheets)]
    Lens[Lens]

    G -- promotion sources --> API
    ZD -- promotion CSVs --> API
    API -- createJob --> A3
    A3 -- signed webhook --> API
    API <--> DB
    API -- validated promotions --> G
    API -- validated promotions --> ZD
    API -- logs & promotions --> BQ
    UI -- read only --> DB
    UI -- Ops actions --> API
    Lens -- daily counts --> UI
`;

export default function DocsOverviewPage() {
  return (
    <>
      <DocHeader
        title="Promotions system overview"
        lead="Three parts work together to find, check and deliver retail promotions for clients (Google, Ziff Davis)."
      />

      <DocTable
        head={["Part", "Repo", "Role"]}
        rows={[
          [
            <strong key="p">promotions-service (API)</strong>,
            <code key="r">promotions-service</code>,
            "Owns the data. Imports client data, queues A3 jobs, receives results, decides verdicts, exports.",
          ],
          [
            <strong key="p">A3 platform</strong>,
            <>
              A3 project <code>promotion-extraction-google</code>
            </>,
            <>
              Runs browser + LLM workflows on merchant sites: <code>extract-promotions</code>,{" "}
              <code>validate-promotions</code>.
            </>,
          ],
          [
            <strong key="p">promotions_dashboard (UI)</strong>,
            <code key="r">promotions_dashboard</code>,
            "This app. Internal ops and the client portal. Reads MongoDB, calls the API for ops actions.",
          ],
        ]}
      />

      <Diagram chart={OVERVIEW} />

      <h2>Pages</h2>
      <ol>
        <li>
          <Link href="/docs/architecture">Architecture</Link>: components, data stores, auth
        </li>
        <li>
          <Link href="/docs/a3-integration">A3 integration</Link>: how jobs are queued and results come
          back
        </li>
        <li>
          <Link href="/docs/google-pipeline">Google pipeline</Link>: sources → extraction → validation →
          export
        </li>
        <li>
          <Link href="/docs/ziff-davis-pipeline">Ziff Davis pipeline</Link>: CSV import → conversion →
          validation → export
        </li>
        <li>
          <Link href="/docs/validation-verdict">Validation verdict</Link>: how a promotion becomes valid
          or invalid
        </li>
        <li>
          <Link href="/docs/dashboard">Dashboard</Link>: what the UI shows and how it gets data
        </li>
      </ol>

      <h2>Glossary</h2>
      <ul>
        <li>
          <strong>Promotion source</strong>: a product URL (Google) where promotions should be extracted.
        </li>
        <li>
          <strong>Client promotion record</strong>: a raw promotion row supplied by a client (Ziff Davis).
        </li>
        <li>
          <strong>Promotion</strong>: normalized Ubio promotion (conditions + benefits), ready to
          validate.
        </li>
        <li>
          <strong>Extraction</strong>: A3 reads a page and returns the promotions on it.
        </li>
        <li>
          <strong>Validation</strong>: A3 opens the page, applies the promotion and reports whether the
          benefit landed.
        </li>
        <li>
          <strong>Bundle</strong>: one import batch (one Google bucket bundle or one ZD file).
        </li>
      </ul>
    </>
  );
}
