<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Releasing

**One version line.** `package.json` and the git tag are always the same
number, and that number is what runs in production.

We briefly had two: `package.json` on `0.2.x` and tags on `v0.8.x`. They
produced images into the same registry, and a stale `v0.2.12` deploy PR sat
open in `ubio/infrastructure` that would have rolled production back and
removed the client portal. Don't recreate that split.

To release:

```bash
# 1. bump package.json (patch/minor as appropriate), commit with your change
# 2. push main first, and let it land
git push origin main
# 3. then tag that exact version — the tag push is what triggers CD
git tag v$(node -p "require('./package.json').version")
git push origin v$(node -p "require('./package.json').version")
```

The tag push builds `eu.gcr.io/automation-cloud-registry/promotions-dashboard`
and opens an auto-merged deploy PR against `ubio/infrastructure` at
`automation-cloud/promotions-dashboard`. Argo then syncs it to production at
https://dashboard.promotions.automation.cloud — allow ~10 minutes end to end
before concluding a fix did not work.

If you ever see an open deploy PR for an older tag than production, close it:
merging it is a silent rollback.
