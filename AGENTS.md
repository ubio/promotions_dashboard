<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No tests

Never write, add or modify tests, and never run tests (`npm test`, jest, vitest,
mocha, `node --test` or any variant). `.env` points at the production database,
and test suites in this project and in `promotions-service` delete data. Verify
changes with `npx tsc --noEmit` and `npx eslint` only; running tests is left to a
human. A PreToolUse hook (`.claude/hooks/block-tests.sh`) enforces this.

# Releasing

**One version line.** `package.json` and the git tag are always the same
number, and that number is what runs in production.

We briefly had two: `package.json` on `0.2.x` and tags on `v0.8.x`. They
produced images into the same registry, and a stale `v0.2.12` deploy PR sat
open in `ubio/infrastructure` that would have rolled production back and
removed the client portal. Don't recreate that split.

To release, use `npm version`, which bumps `package.json`, commits and tags
in one step — so the two can never disagree:

```bash
npm version patch        # or minor / major
```

`preversion` runs lint and typecheck first and aborts the release if either
fails; `postversion` pushes the current branch and the tags. The tag push is
what triggers CD.

The tag push builds `eu.gcr.io/automation-cloud-registry/promotions-dashboard`
and opens an auto-merged deploy PR against `ubio/infrastructure` at
`automation-cloud/promotions-dashboard`. Argo then syncs it to production at
https://dashboard.promotions.automation.cloud — allow ~10 minutes end to end
before concluding a fix did not work.

If you ever see an open deploy PR for an older tag than production, close it:
merging it is a silent rollback.

# Related projects

This is the **dashboard** (Next.js UI); it does not own the data. The backend
API is `promotions-service`, at `../promotions-service`, reached via
`PROMOTIONS_SERVICE_URL`. When a feature needs new data or endpoints, change
the API there first and consume it here — don't reimplement backend logic in
`lib/`.
