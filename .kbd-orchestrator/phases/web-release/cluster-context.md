# Target cluster context

Input for `/kbd-assess web-release`. Everything here was read from the Surreal
Memory MCP server on 2026-11-14. **None of it was checked against the live
cluster in this session.** Treat it as recorded state from another session and
confirm it during assess.

## Sources

| Memory id | Categories | Written |
|---|---|---|
| `d208848e-5869-4c94-becc-ddc503dc24fb` | infrastructure, kubernetes, gke, knowme | 2026-11-14 13:12 UTC |
| `881f511b-a5e4-4f5a-921a-207ef9c7f58e` | infrastructure, kubernetes, tls, cert-manager, knowme | 2026-11-14 13:12 UTC |
| `cccc18fb-8631-49a9-89a9-9c124a875c94` | infrastructure, dns, cloudflare, external-dns, knowme | 2026-11-14 13:12 UTC |
| `8bd62299-642f-40b8-b274-61e817387ced` | infrastructure, argocd, gitops, knowme | 2026-11-14 13:12 UTC |
| `522abb83-981a-47de-b5b7-fb1b44d47ee7` | infrastructure, kubernetes, gotchas, helm | 2026-11-14 13:12 UTC |
| entity `gke-knowme-corporate-us-south1-main` | kubernetes_cluster | 2026-11-14 13:11 UTC |

All five notes and the entity were written by one session (claude-code
`36c6aab2-34a4-4be0-855b-54e4491fc977`) that set up the platform baseline today.

## Assumption to confirm

The memory notes describe the GKE cluster below. They do not mention Know Meet
or `meet.know-me.tools`. That this is the target cluster for the web release is
an inference from the operator's request, the `know-me.tools` DNS zone and the
baseline date. The kubeconfig also has a context named `know-me`, which is a
different cluster (Linode LKE `lke653426`). Confirm the target before any
deployment work.

## Cluster

- kubectl context: `gke_knowme-corporate_us-south1_main`
- GCP project `knowme-corporate`, region `us-south1`, cluster name `main`
- GKE Standard (not Autopilot), Kubernetes v1.36.4-gke, 2 nodes
- Workload Identity: not enabled
- Cloud DNS: no zones in the project (DNS is on Cloudflare)
- Existing application namespace: `tribehealth`
- Auth: gcloud account `travis@know-me.tools`. When kubectl fails with
  "Reauthentication failed / gke-gcloud-auth-plugin exit 1", the operator must
  run `gcloud auth login travis@know-me.tools` interactively. Agents cannot.

## Platform baseline (installed 2026-11-14 with Helm 4)

| Component | Version | Namespace | Notes |
|---|---|---|---|
| Envoy Gateway | v1.10.0 | `envoy-gateway-system` | Helm release `eg`; Gateway API CRDs v1.6.1, standard channel |
| cert-manager | v1.21.3 | `cert-manager` | `enableGatewayAPI=true` |
| external-dns | v0.24.0 | `external-dns` | Cloudflare provider |
| Argo CD | v3.6.1 | `argocd` | chart `argo/argo-cd` 10.18.0; ClusterIP only |

## Ingress

- Routing is Gateway API on Envoy Gateway. There is no ingress-nginx.
- The shared Gateway `main-gateway` in `envoy-gateway-system` **does not exist
  yet**. Memory lists creating it as pending. It needs a port-80 listener that
  allows routes from all namespaces if the HTTP-01 solver is to be used.
- No Gateway of any kind is recorded, so the web release needs one: either the
  shared `main-gateway` or a Gateway of its own.

## TLS

- ClusterIssuers: `letsencrypt-staging` and `letsencrypt-prod`. No ACME email
  is set.
- Default solver: DNS-01 through Cloudflare, using Secret
  `cert-manager/cloudflare-api-token` (key `api-token`). It works for every
  Cloudflare zone, supports wildcards and needs no Gateway.
- Verified on 2026-11-14 by a staging certificate for
  `cm-dns01-test.know-me.tools`, issued in about 79 seconds.
- Opt-in HTTP-01 solver: only for Certificates labelled
  `use-http01-solver: "true"`. It routes through `main-gateway`, so it cannot
  work until that Gateway exists.
- To get a certificate: annotate a Gateway with
  `cert-manager.io/cluster-issuer: letsencrypt-prod` and give its HTTPS
  listener a hostname. Test with staging first.

## DNS

- Provider: Cloudflare. The API token has DNS edit on `know-me.tools` and eight
  other zones.
- The token is `CF_TOKEN` in `~/.bash_profile`. It is copied into two Secrets
  named `cloudflare-api-token` (key `api-token`), in `external-dns` and
  `cert-manager`. Rotate both when `CF_TOKEN` changes.
- external-dns settings:
  - no `domainFilters`, so it acts on every zone the token covers
  - sources: `service`, `gateway-httproute`, `gateway-grpcroute`,
    `gateway-tlsroute`
  - policy `upsert-only`: it never deletes, so stale records are cleaned up by
    hand
  - `txtOwnerId`: `gke-knowme-corporate-us-south1-main`
  - records are DNS-only, not proxied through Cloudflare
- external-dns creates the A/CNAME records for routes. cert-manager creates the
  ACME `_acme-challenge` TXT records.
- Consequence for this phase: an HTTPRoute with hostname `meet.know-me.tools`
  should be enough for the DNS record to appear.

## GitOps (Argo CD)

- Admin credentials are exported in `~/.bash_profile` as
  `KNOWME_ARGOCD_ADMIN_USER` and `KNOWME_ARGOCD_ADMIN_PASSWORD`. Login was
  verified. Values are not recorded in memory and must not be written here.
- Access is by port-forward only:
  `kubectl --context gke_knowme-corporate_us-south1_main port-forward -n argocd svc/argocd-server 8080:443`,
  then `argocd login localhost:8080 --insecure` with the variables above.
- `argocd-initial-admin-secret` still exists in the cluster. Memory recommends
  deleting it.
- No Argo CD Application, AppProject or repository connection is recorded.
- The issuer manifest and Helm values for the baseline exist only in another
  session's scratchpad. They are not in any infra or GitOps repo.

## Operational gotchas

- Envoy Gateway upgrades: apply the CRDs first from
  `oci://docker.io/envoyproxy/gateway-crds-helm` with
  `kubectl apply --server-side --force-conflicts`, then `helm upgrade eg ...
  --force-conflicts`. Without it, Helm 4 fails on the
  `safe-upgrades.gateway.networking.k8s.io` ValidatingAdmissionPolicy.
- Creating Secrets from `~/.bash_profile` values: pipe the value into
  `kubectl create secret generic ... --from-file=key=/dev/stdin`, so it never
  appears in argv or output.
- `~/.bash_profile` is mode 644 and holds secrets. Memory recommends `chmod 600`.

## Not recorded in memory

These are needed to configure the deployment and have to be decided or
discovered during assess and analyze:

- **Container registry.** No registry or image pull setup is recorded. With
  Workload Identity off, pulls from Artifact Registry depend on the node
  service account.
- **GitOps repository.** No repo holds cluster or application manifests, and
  Argo CD is not connected to one.
- **Namespace** for Know Meet, and any quotas or NetworkPolicy conventions.
- **Runtime secrets.** How `LIVEKIT_*` and other server-side secrets reach the
  cluster (no external-secrets or sealed-secrets is recorded).
- **Backend services.** Whether a LiveKit server, a token service or any other
  backend runs on or near this cluster.
- **Node capacity.** Only "2 nodes" is recorded: no machine type, no autoscaling.
- **Observability.** No logging, metrics or alerting stack is recorded.
- **`main-gateway` ownership.** Who creates it, and whether this phase may.
