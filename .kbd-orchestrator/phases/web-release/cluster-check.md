# Cluster check (task 1.6)

Read-only check of `cluster-context.md` against the live cluster, run by the
lead on 2026-11-15 after the operator re-authenticated gcloud. Context
`gke_knowme-corporate_us-south1_main`. Only `kubectl get`, `kubectl
api-versions` and `gcloud container clusters describe` were used. Nothing was
created, changed or deleted. No Secret value was read; Secrets were listed by
name only.

## Result per fact

| Fact in `cluster-context.md` | Result | Observed |
|---|---|---|
| GKE Standard, v1.36.4-gke, 2 nodes | observed | `v1.36.4-gke.2377000`, 2 Ready nodes, Autopilot off, REGULAR channel |
| Workload Identity not enabled | observed | `workloadIdentityConfig: {}` |
| Namespaces `argocd`, `cert-manager`, `envoy-gateway-system`, `external-dns`, `tribehealth` | observed | all Active; no `know-meet` namespace |
| Envoy Gateway v1.10.0, release `eg` | observed | `docker.io/envoyproxy/gateway:v1.10.0`, instance label `eg`, 1/1 |
| Gateway API CRDs, standard channel | observed, wider | `gateway.networking.k8s.io/v1` served; experimental-group CRDs (`x-k8s.io`) and `listenersets` are also installed. CRD version label not read |
| cert-manager v1.21.3 | observed | controller image `v1.21.3`, 1/1 |
| external-dns v0.24.0, Cloudflare | observed | image `v0.24.0`; args: sources `service`, `gateway-httproute`, `gateway-grpcroute`, `gateway-tlsroute`; `--policy=upsert-only`; `--registry=txt`; owner id `gke-knowme-corporate-us-south1-main`; no domain filter; token from Secret `cloudflare-api-token` |
| Argo CD v3.6.1, ClusterIP only | observed | all six deployments ready on `v3.6.1`; no LoadBalancer Service in the cluster |
| ClusterIssuers `letsencrypt-staging`, `letsencrypt-prod` | observed | both Ready; DNS-01 through Cloudflare by default; HTTP-01 only for the `use-http01-solver` label, through `envoy-gateway-system/main-gateway` |
| `main-gateway` does not exist yet | observed | no Gateway, HTTPRoute or Certificate in any namespace |
| No Argo CD Application or repository connection | observed | no Application, no repository or repo-creds Secret; AppProject `default` exists |
| **GatewayClass `eg`** (analysis.md and wr08 design, not `cluster-context.md`) | **differs** | **no GatewayClass exists.** The controller runs, but nothing has created a class for it |

## New facts

- Nodes: one pool `default-pool`, machine type `n2-standard-8`, no autoscaling.
- No LoadBalancer Service exists, so the Gateway's public address will be new.
  Envoy Gateway creates it when the first Gateway is accepted.
- Datapath is `LEGACY_DATAPATH`, so NetworkPolicy is not enforced unless it is
  enabled separately. Not checked further.

## Not checked

- The ACME email on the issuers, the Cloudflare token's zone scope, and whether
  `argocd-initial-admin-secret` still exists.
- Whether `meet.know-me.tools` already has a DNS record in Cloudflare.
- Node pull access to `ghcr.io` (public images need none).

## Effect on the plan

1. **GatewayClass.** wr08 must create a GatewayClass named `eg` with
   controller `gateway.envoyproxy.io/gatewayclass-controller` in
   `infra/platform`, next to `main-gateway`. It is cluster-scoped and shared.
2. **Contract.** The boundary packet says `verify-cluster` "confirms the
   gateway class" before the apply. As written that check would stop the run,
   because the class does not exist until the apply. This needs the operator's
   decision; it is not part of the four approved amendment points.
3. Everything else the manifests depend on matches the recorded facts.
