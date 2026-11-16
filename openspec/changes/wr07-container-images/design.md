## Context

Library and pattern decisions come from the Analyze stage (`.kbd-orchestrator/phases/web-release/library-candidates.json`).

## Decisions

### cand-008: static-web-server (adopt)

The bundle is static files. A server with no application code is the smallest internet-facing surface.

Evidence:

- Tier 3: gh api: latest release v2.44.2 published 2026-11-12; Apache-2.0; pushed 2026-11-14. (https://github.com/static-web-server/static-web-server/releases/latest)
- Tier 2: page-fallback (env SERVER_FALLBACK_PAGE) serves an HTML file with status 200 for missing paths and keeps 404 for missing assets; default port 8080; custom headers per glob in [[advanced.headers]]; a health endpoint exists. (https://github.com/static-web-server/static-web-server/blob/master/src/settings/cli.rs)

Risks:

- Only the SPDX id reported by the GitHub API was read; the licence file itself was not.
- Not exercised with this bundle yet; deep-link behaviour is proven only by the hosted check.

### cand-010: GitHub Container Registry (adopt)

Organisation precedent; no new cloud IAM.

Evidence:

- Tier 1: Organisation images are published as ghcr.io/know-me-tools/*, pushed with the workflow token. (https://github.com/Know-Me-Tools/conduit/blob/HEAD/.github/workflows/deploy.yaml)
- Tier 1: gh repo view: visibility PUBLIC, default branch main. (https://github.com/Know-Me-Tools/know-meet)

Risks:

- Packages must be made public by the operator, or the cluster needs a pull secret.
