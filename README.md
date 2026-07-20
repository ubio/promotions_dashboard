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

MongoDB is accessed only from the server (React Server Components) with
`readPreference: secondaryPreferred`. The app never writes to the database.

## Auth

Same model as SignalFlow: Google Sign-In, verified server-side, restricted to the
allowed email domains. On success the server sets an 8-hour httpOnly session cookie
(JWT). `proxy.ts` redirects every unauthenticated request to `/login`. The deployed
domain must be added to the OAuth client's authorized JavaScript origins in Google
Cloud Console.

## Pages

- `/jobs` — job list with Validation/Extraction tabs, search, filters (client,
  report type, success, fail code) and pagination
- `/jobs/validation/[id]` — full validation job: result, reasoning, promotion under
  validation, screenshot/video evidence, LLM costs, raw JSON
- `/jobs/extraction/[id]` — full extraction job: visited URLs, promotions found, raw JSON
- `/promotions` — promotion list with search and validity/client filters
- `/promotions/[id]` — promotion details: conditions, benefits, applicability,
  full validation history, raw JSON

Every detail page has a collapsible raw JSON view so nothing in the document is hidden.
