# Cluster manifests (`infra`)

Kubernetes manifests for `meet.know-me.tools` on GKE cluster `main`
(context `gke_knowme-corporate_us-south1_main`). OpenSpec change
`wr08-cluster-manifests`, tasks 8.1, 8.2, 8.3 and the Argo CD part of 8.5. Under the VLBV
method nothing here has been rendered or applied before the release boundary run.

## Layout

| Path | Creates |
|---|---|
| `argocd/projects.yaml` | Argo CD AppProjects `know-meet` and `know-meet-platform`: this repository only, one namespace each, only the kinds each Application renders. |
| `argocd/know-meet.yaml` | Argo CD Application `know-meet` (project `know-meet`). Syncs `k8s/overlays/production` from `main`. |
| `argocd/know-meet-platform.yaml` | Argo CD Application `know-meet-platform` (project `know-meet-platform`). Syncs `platform` from `main`. |
| `k8s/base/` | Namespace `know-meet`; Deployments and Services `know-meet-web` and `know-meet-token-service`. |
| `k8s/overlays/production/` | Pulls in `k8s/base`; HTTPRoutes `know-meet-https` and `know-meet-http-redirect`; image tags; security headers. |
| `k8s/overlays/production/security-headers.yaml` | Generated. A local-config ConfigMap kustomize reads and does not apply. |
| `platform/` | GatewayClass `eg`, Gateway `main-gateway` and Certificate `meet-know-me-tools` (namespace `envoy-gateway-system`). Shared. |

Two Applications in two projects. An AppProject's kind whitelist applies to every namespace
it allows, so the app (namespace `know-meet`: Namespace, Deployment, Service, HTTPRoute,
NetworkPolicy) and the shared platform (namespace `envoy-gateway-system`: Gateway,
Certificate; cluster-scoped GatewayClass) each get a project that admits exactly their kinds.

The Secret `know-meet-livekit` (keys `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`) is **not** in Git. The operator creates it in namespace `know-meet`
before the first sync (runbook in `docs/release/`). The token service reads it through
`secretKeyRef` only.

## Hostname rule

Only `meet.know-me.tools` appears on a listener, route or certificate. external-dns on this
cluster has no domain filter and policy `upsert-only`: any other hostname that reaches the
Gateway becomes a public DNS record that nothing deletes. Both listeners carry the hostname
and admit routes from namespace `know-meet` only.

## Placeholders to replace before release

**Image tag.** `k8s/overlays/production/kustomization.yaml` sets `newTag:
pin-commit-sha-in-task-8-6` for both images. No such image exists, so a sync before the
pin fails at image pull. Task 8.6 replaces both lines with the release commit SHA (the
`tag` output of the `images` workflow) by pull request.

**Content-Security-Policy.** `security-headers.yaml` holds a placeholder CSP
(`default-src 'none'; frame-ancestors 'none'`). It fails closed: with it the site serves a
page that runs no script. The real value is build output that names the public LiveKit URL:

```bash
KM_LIVEKIT_URL=wss://<public LiveKit host> pnpm --filter @know-meet/web run build:hosted
node tooling/release/src/render-gateway-headers.ts          # rewrites security-headers.yaml
node tooling/release/src/render-gateway-headers.ts --check  # exit 0 only if file == artifact
```

The URL must be the repository variable `KM_LIVEKIT_URL` the `images` workflow used, so
the header and the image's `<meta>` policy match. Commit the rewritten file in the same
pull request as the tag pin. `--check` exits 1 while the placeholder is committed.

## Certificate: staging, then production

`platform/certificate.yaml` starts on `letsencrypt-staging` (DNS-01 through Cloudflare). To
move to production, one line changes by pull request:

```yaml
    name: letsencrypt-staging   # spec.issuerRef.name  ->  letsencrypt-prod
```

cert-manager reissues when `issuerRef` changes and overwrites Secret
`meet-know-me-tools-tls` in place, so the listener never points at a missing Secret.
Nothing has to be deleted afterwards: there is no separate staging Secret, and
`revisionHistoryLimit: 1` drops the old CertificateRequest. Do **not** delete
`meet-know-me-tools-tls`; it is the live certificate. Confirm the switch by the issuer
organisation `Let's Encrypt` (staging shows `(STAGING) Let's Encrypt`).

On first sync the Certificate is in sync wave -1 and the Gateway in wave 0, so Argo CD
applies the Gateway only after the Certificate is Ready.

## Security headers

Every HTTPS rule, including `/api/healthz`, sets Strict-Transport-Security, the CSP,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin` and
`Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=()`.
`set` replaces a header the backend already sent (the token service sends `nosniff`), so
none appears twice. Gateway API limits a header value to 4096 characters; the generator
refuses a longer CSP.

## Client address

The token service runs with `KM_TRUSTED_PROXY_HOPS=1`: it charges a request to the
rightmost `X-Forwarded-For` entry. Envoy appends the address of its TCP peer to that header.
The GCP load balancer in front of Envoy is a passthrough L4 load balancer, so with the Envoy
Service on `externalTrafficPolicy: Local` that peer is the real client. **Unverified:** if
the Service uses `Cluster`, the peer is a node address, every client shares one rate-limit
bucket, and the limit fails closed (too strict, never forgeable). Check the observed
behaviour at the boundary.

## Apply

The operator applies the projects and Applications; Argo CD does the rest. Every later change
is a merged pull request.

```bash
kubectl --context gke_knowme-corporate_us-south1_main apply -f infra/argocd/projects.yaml
kubectl --context gke_knowme-corporate_us-south1_main apply -f infra/argocd/know-meet.yaml
kubectl --context gke_knowme-corporate_us-south1_main apply -f infra/argocd/know-meet-platform.yaml
```

**Moving from the single Application (once).** Before this split, Application `know-meet`
in project `default` also synced `platform`. In order:

1. Apply `projects.yaml`. Nothing syncs differently yet.
2. Merge the pull request that removes `platform` from the overlay. `know-meet` stops
   rendering the three platform objects; they carry `Prune=false,Delete=false`, so Argo CD
   leaves them running (the Application shows them as needing a prune it will not do).
3. Apply `know-meet.yaml` (now project `know-meet`) and `know-meet-platform.yaml`. The new
   Application adopts the three objects unchanged; only their tracking annotation moves.

Applying `know-meet.yaml` with project `know-meet` before step 2 makes its sync fail (the
platform kinds are not allowed), which deletes nothing but stops deploys until step 2.
Applying `know-meet-platform.yaml` before step 2 makes both Applications claim the same three
objects (a SharedResourceWarning; their tracking annotation flips on each sync). That too
deletes nothing, because of `Prune=false`, but keep to the order.
