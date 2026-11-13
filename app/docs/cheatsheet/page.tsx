import Link from "next/link";
import { Callout, CodeBlock, DocHeader } from "@/components/docs/DocParts";

const API_LOGS_URL =
  "https://console.cloud.google.com/logs/query;query=resource.type%3D%22k8s_container%22%0Aresource.labels.cluster_name%3D%22ac-production%22%0Aresource.labels.location%3D%22europe-west1%22%0Aresource.labels.container_name%3D%22promotions-service%22%0Aresource.labels.namespace_name%3D%22default%22%0Aresource.labels.project_id%3D%22automation-cloud-production%22%0A--%20SEARCH%2528%22failed%20to%20find%20a%20promotion%20for%20validation%20log%22%2529%0A;duration=PT1H?project=automation-cloud-production";

const LINKS = [
  {
    label: "A3 project",
    href: "https://app.athree.dev/org/ubio/p/promotion-extraction-google/s/default",
  },
  {
    label: "API ENVs",
    href: "https://github.com/ubio/infrastructure/blob/main/automation-cloud/promotions-service/base/deployment.yaml",
  },
  { label: "API logs", href: API_LOGS_URL },
  {
    label: "MongoDB cluster",
    href: "https://cloud.mongodb.com/v2/6008655482f3c73743e31d97#/clusters/detail/ubio-shopping",
  },
  {
    label: "Metrics",
    note: "not used besides the alert one",
    href: "https://metrics.ubio.dev/d/cc722790-fd46-47ca-abaf-46553f1aab4c/ubio-promotions?orgId=1",
  },
];

const LOCK_SOURCES = `
// Same as "Stop extraction" on the Ops page.
db.promotionSources.updateMany(
  { $or: [{ lockId: null }, { lockId: { $exists: false } }] },
  {
    $set: {
      lockId: "manual_stop_from_dashboard-" + new Date().toISOString().slice(0, 10),
      lockedAt: Date.now(),
    },
  }
)
`;

const UNLOCK_SOURCES = `
// Same as "Restart extraction" on the Ops page. Run both.

// 1. Manually stopped sources
db.promotionSources.updateMany(
  { lockId: /^manual_stop_from_dashboard-/ },
  { $set: { lockId: null, lockedAt: 0 } }
)

// 2. Failed sources (jobId stays as history; the next job overwrites it)
db.promotionSources.updateMany(
  { jobResult: "failure" },
  { $set: { lockId: null, lockedAt: 0 }, $unset: { jobResult: "" } }
)
`;

const PROMOTIONS_TO_VALIDATE = `
// Promotions the validation enqueue would still pick up.
const lockExpiredBefore = Date.now() - 30 * 60 * 1000; // LOCK_TTL_MS

db.todayPromotions.aggregate([
  {
    $match: {
      $and: [
        { $or: [{ lockId: null }, { lockedAt: { $lt: lockExpiredBefore } }] },
        { "systemMeta.runValidation": true },
        { googleCouponValueType: { $ne: "no_structured_data" } },
        {
          // Google: qualified only. Other clients: also never-qualified ones.
          $or: [
            { "qualification.isQualified": true },
            { clientId: { $ne: "Google" }, qualification: null },
          ],
        },
        // The 3rd claim (MAX_VALIDATION_LOCKS_PER_PROMOTION) abandons the promotion instead.
        { lockCount: { $not: { $gte: 2 } } },
      ],
    },
  },
  {
    $lookup: {
      from: "merchants",
      localField: "domain",
      foreignField: "domain",
      pipeline: [{ $project: { _id: 0, validationsAllowed: 1, scriptGenerated: 1 } }],
      as: "merchant",
    },
  },
  { $set: { merchant: { $first: "$merchant" } } },
  { $match: { "merchant.validationsAllowed": { $ne: false } } },
  {
    $project: {
      clientId: 1,
      domain: 1,
      title: 1,
      lockCount: 1,
      // Merchants with a generated script are picked first.
      scriptFirst: {
        $and: [
          { $eq: ["$merchant.scriptGenerated", true] },
          { $eq: ["$merchant.validationsAllowed", true] },
        ],
      },
    },
  },
  { $sort: { scriptFirst: -1, clientId: 1, domain: 1 } },
  // Just the numbers: replace the two stages above with
  // { $group: { _id: { clientId: "$clientId", domain: "$domain" }, count: { $sum: 1 } } }
])
`;

const SOURCES_TO_EXTRACT = `
// Sources the extraction enqueue would still pick up, oldest first.
db.promotionSources
  .find({
    clientId: "Google",
    $or: [{ lockId: null }, { lockId: { $exists: false } }],
  })
  .sort({ createdAt: 1 })

// Just the number:
db.promotionSources.countDocuments({
  clientId: "Google",
  $or: [{ lockId: null }, { lockId: { $exists: false } }],
})
`;

export default function CheatsheetPage() {
  return (
    <>
      <DocHeader title="7. Cheatsheet" lead="Links and manual queries for incidents." />

      <h2>Links</h2>
      <ul>
        {LINKS.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
            {link.note && <> ({link.note})</>}
          </li>
        ))}
      </ul>

      <h2>Manual queries</h2>
      <p>
        Run these in MongoDB Atlas (mongosh) against the production database. They mirror what the
        API does; prefer the buttons on the <Link href="/ops">Ops page</Link> when it is reachable.
      </p>
      <Callout>
        The two update queries change production data. Run the read queries first to check the
        counts.
      </Callout>

      <h3>Lock all promotionSources (stop extraction)</h3>
      <p>
        Parks every source waiting for extraction under today&apos;s{" "}
        <code>manual_stop_from_dashboard-YYYY-MM-DD</code> lock, so the enqueue task finds nothing
        to pick.
      </p>
      <CodeBlock>{LOCK_SOURCES}</CodeBlock>

      <h3>Unlock manually locked and failed promotionSources (restart extraction)</h3>
      <p>Returns manually stopped and failed sources to the extraction queue.</p>
      <CodeBlock>{UNLOCK_SOURCES}</CodeBlock>

      <h3>Promotions still to validate</h3>
      <p>
        Same filter the API uses to claim the next promotion. It skips merchants with validations
        blocked and promotions locked in the last 30 minutes.
      </p>
      <CodeBlock>{PROMOTIONS_TO_VALIDATE}</CodeBlock>

      <h3>promotionSources still to extract</h3>
      <CodeBlock>{SOURCES_TO_EXTRACT}</CodeBlock>
    </>
  );
}
