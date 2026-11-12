import Link from "next/link";
import { Diagram } from "@/components/docs/Diagram";
import overviewDiagram from "@/components/docs/diagrams/overview";
import { DocHeader, DocTable } from "@/components/docs/DocParts";

function RepoLink({ repo }: { repo: string }) {
  return (
    <a href={`https://github.com/ubio/${repo}`} target="_blank" rel="noopener noreferrer">
      <code>{repo}</code>
    </a>
  );
}

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
            <RepoLink key="r" repo="promotion-service" />,
            "Owns the data. Imports client data, queues A3 jobs, receives results, decides verdicts, exports.",
          ],
          [
            <strong key="p">A3 platform</strong>,
            <>
              <RepoLink repo="a3-project-google-shopping" />
            </>,
            <>
              Store old SCW version of workflows and current Platform versions. Use it in pair with A3 MCP.
            </>,
          ],
          [
            <strong key="p">promotions_dashboard (UI)</strong>,
            <RepoLink key="r" repo="promotions_dashboard" />,
            "This app. Internal ops and the client portal. Reads MongoDB, calls the API for ops actions.",
          ],
        ]}
      />

      <Diagram svg={overviewDiagram} />

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
