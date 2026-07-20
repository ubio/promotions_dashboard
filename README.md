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
echo 'MONGODB_URI=<connection string>' > .env.local
npm run dev
```

MongoDB is accessed only from the server (React Server Components) with
`readPreference: secondaryPreferred`. The app never writes to the database.

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
