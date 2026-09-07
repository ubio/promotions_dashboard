# Promotions Dashboard

Internal read-only dashboard for the UBIO promotions vertical. Browses the execution
records of the promotions pipeline (extraction and validation jobs), the promotions
themselves, and the evidence (screenshots, reasoning, fail codes) stored in MongoDB.

## Data source

Reads the `Promotions` database on the `ubio-shopping` MongoDB cluster:

| Collection       | Role                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `validationLogs` | Validation job runs — result, fail codes, reasoning, screenshot, LLM cost |
| `extractionLogs` | Extraction/discovery job runs — visited URLs, promotions found            |
| `promotions`     | Promotion entities — conditions, benefits, validity status                |
| `merchants`      | Merchant records with aggregated validation stats                         |

Relationships: `validationLogs.promotionId → promotions._id`,
`promotions.extractionLogId → extractionLogs._id`, `promotions.merchantId → merchants._id`.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Required environment variables:

| Variable                 | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `MONGODB_URI`            | Connection string for the `ubio-shopping` cluster                |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client id used for the sign-in button               |
| `ALLOWED_EMAIL_DOMAINS`  | Comma-separated email domains allowed to sign in                 |
| `JWT_SECRET`             | Random secret for signing session cookies (`openssl rand -hex 32`) |
| `CLIENT_EMAIL_DOMAINS`   | Optional: `domain:ClientId` pairs granting client-portal access  |
| `CLIENT_VALIDATION_RATES`| Optional: `ClientId:rate` pairs for the revenue estimate         |
| `DEFAULT_VALIDATION_RATE`| Optional: fallback USD rate per successful validation           |

MongoDB is accessed only from the server (React Server Components) with
`readPreference: secondaryPreferred`. The app never writes to the database.

## Auth

Same model as SignalFlow: Google Sign-In, verified server-side, restricted to the
allowed email domains. On success the server sets an 8-hour httpOnly session cookie
(JWT). `proxy.ts` redirects every unauthenticated request to `/login`. The deployed
domain must be added to the OAuth client's authorized JavaScript origins in Google
Cloud Console.

For local development you can skip login entirely by setting `AUTH_DISABLED=true`
in `.env.local`. Never set it in production.

## Client portal

Users whose email domain appears in `CLIENT_EMAIL_DOMAINS` (e.g.
`ziffdavis.com:ZiffDavis`) sign in with the same Google button but get a
`client` role scoped to that clientId. They are fenced into `/portal`:

- `/portal` — overview KPIs, validations-per-day and validity breakdown, scoped
  to their promotions only
- `/portal/promotions` (+ detail) — their promotions with validation history,
  reason codes, reasoning and screenshot evidence

The portal hides internal surfaces entirely: LLM costs, merchants, raw JSON,
errored runs and other clients' data. Every portal query filters by the
session's clientId server-side, and promotion detail pages 404 on any
cross-client id.

## Docker

```bash
docker build -t promotions-dashboard .
docker run -p 3000:3000 \
  -e MONGODB_URI=... -e GOOGLE_OAUTH_CLIENT_ID=... \
  -e ALLOWED_EMAIL_DOMAINS=... -e JWT_SECRET=... \
  promotions-dashboard
```

Multi-stage build on `node:22-alpine` using Next.js standalone output; runs as a
non-root user on port 3000. All configuration is runtime env — nothing is baked
into the image.

## Pages

- `/promotions` — one browsing hub with flat tabs: Promotions, Validations,
  Discovery, Bot detection, Client files. Replaces the separate Jobs, Events and
  Promotions nav items and their nested sub-tabs; `/jobs` and `/events` still
  resolve for old links
- `/reports/runs` — the individual validations behind any number on the report:
  reason (fail-code) breakdown, LLM reasoning, screenshot evidence, and CSV
  download of exactly that selection
- `/reports` — cross-period reporting: any date range, grouped by customer /
  merchant / day / month, filtered by customer, merchant and outcome, with
  period-on-period comparison and CSV download of both the report and the
  matching validation runs
- `/stats` — KPI tiles and daily charts: validations per day (success/failed),
  success rate, and LLM cost, over a selectable 7/30/60/90-day window
- `/jobs/validation/[id]` — full validation job: result, reasoning, promotion under
  validation, screenshot/video evidence, LLM costs, raw JSON
- `/jobs/extraction/[id]` — full extraction job: visited URLs, promotions found, raw JSON
- `/merchants` — per-merchant validation stats joined with LLM costs aggregated
  from that merchant's jobs
- `/promotions/[id]` — promotion details: conditions, benefits, applicability,
  full validation history, raw JSON

Every detail page has a collapsible raw JSON view so nothing in the document is hidden.

## Reporting notes

`/reports` aggregates `validationLogs` directly rather than the pre-aggregated
`stats` collection, because `stats` keeps only a rolling 30 days of daily
buckets plus monthly rollups while reports need arbitrary ranges back to the
first run (2026-05-21).

Two data caveats are handled in `lib/reports.ts`:

- **Durations.** 314 runs (all errored, ZiffDavis, from 2026-08-28) store a
  wall-clock timestamp in `time` instead of an elapsed duration — a bug in the
  writing service. Values at or above `MAX_PLAUSIBLE_DURATION_MS` are excluded
  from timing stats, and the UI reports how many runs were counted.
- **Revenue** is `passed runs × per-client rate` from `CLIENT_VALIDATION_RATES`.
  It is a crude estimate that ignores minimums, tiers and other contract terms.

Year-on-year comparison is not yet possible: the database starts in May 2026.
