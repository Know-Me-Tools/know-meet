## Why

The target cluster has Envoy Gateway, cert-manager, external-dns and an idle Argo CD. No manifest for Know Meet exists and the shared Gateway has not been created.

## What Changes

- Kustomize base and production overlay under `infra/k8s`: namespace, two Deployments, two Services, probes and security context
- The shared `main-gateway` under `infra/platform`; HTTPRoutes with the `/api` split, HTTP redirect and a response-header filter generated from the CSP artifact
- The certificate path from `letsencrypt-staging` to `letsencrypt-prod`
- The Secret referenced by name only; an operator runbook in `docs/release/`
- One Argo CD Application; read-only cluster and endpoint verification tools
- A pull request that pins the release image tags in the production overlay

## Capabilities

### New Capabilities

- `cluster-deployment`: The deployment is defined in Git and applied by Argo CD

### Modified Capabilities

- None

## Impact

- Owner roles: `livekit-platform`, `delivery-lead`. Creating `main-gateway` here is an adopted default; the platform has no repo of its own.
- Phase: `web-release`; plan: `.kbd-orchestrator/phases/web-release/plan.md`
- Contract: `.kbd-orchestrator/phases/web-release/adopted-contract.json` sha256 9ccc9805…
