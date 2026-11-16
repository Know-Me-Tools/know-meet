# Packaged release stack (`tooling/release`)

Local stack for the packaged run of the web release: the two images built from this
commit, a test-only proxy that applies the cluster route split, and the static image on its
own port. OpenSpec change `wr07-container-images`, task 7.4. Used by `wr09-release-boundary`
task 9.2. Under the VLBV method nothing here has been run before the boundary run.

## Services

| Service         | Image                                                                  | Published        | Role                                                                                                     |
| --------------- | ---------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `proxy`         | `nginxinc/nginx-unprivileged:1.30.6-alpine-slim` (pinned by digest)    | `127.0.0.1:8080` | Same-origin entry: `/api/*` to `token-service`, everything else to `web`. Adds no HSTS, CSP or redirect. |
| `web`           | `know-meet-web:boundary`, built from `apps/web/Dockerfile`             | `127.0.0.1:8081` | The static image alone, no proxy. Also the proxy's upstream.                                             |
| `token-service` | `know-meet-livekit:boundary`, built from `services/livekit/Dockerfile` | none             | Reachable only through the proxy.                                                                        |

The image tags are the ones `tests/release/scan-contract.md` defaults to.

### Why nginx-unprivileged

The proxy only has to forward by path prefix and append the client address to
`X-Forwarded-For` (the token service reads the entry `KM_TRUSTED_PROXY_HOPS=1` from the right,
as it does behind Envoy Gateway). The official nginx build that runs as a non-root user on
port 8080 does that with a short config, no templating and no extra image to trust. Caddy
would also work; nginx was chosen because its `$proxy_add_x_forwarded_for` is the same append
semantics the service is written against. The proxy sets no `Strict-Transport-Security`, so the
WR-3 negative control (HSTS missing on the bare static image) is observed on port 8081, which
the proxy is not in front of. The image is pinned by tag and by the index digest Docker Hub
reports for that tag; the digest was read from the Docker Hub tag listing, not pulled.

## Run

From the repository root. `LIVEKIT_*` come from your shell and are never written to a file;
compose passes them to the token service by name.

```bash
export LIVEKIT_URL=wss://...        # the public URL; also the build argument of the web image
export LIVEKIT_API_KEY=...          # from your own secret store
export LIVEKIT_API_SECRET=...
docker compose -f tooling/release/compose.yaml build
docker compose -f tooling/release/compose.yaml up -d --wait
curl -fsS http://localhost:8080/api/healthz     # ready when this answers 200
```

Stop and remove: `docker compose -f tooling/release/compose.yaml down`.

If `LIVEKIT_URL` is unset, compose stops before building and names it. If a `LIVEKIT_*`
variable is unset, the token service exits and logs the variable name, not a value.

## Token service settings in this stack

| Variable                       | Value here              | Why                                                                                                                |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `KM_SITE_ORIGIN`               | `http://localhost:8080` | Must equal the page origin the browser sends as `Origin`; matches the packaged project's default base URL.         |
| `KM_TRUSTED_PROXY_HOPS`        | `1`                     | One proxy (nginx) appends to `X-Forwarded-For`.                                                                    |
| `KM_TOKEN_TTL_SECONDS`         | `600`                   | Service default.                                                                                                   |
| `KM_RATE_LIMIT_BURST`          | `10`                    | Service default. Headroom for the specs that share the one client bucket.                                          |
| `KM_RATE_LIMIT_REFILL_SECONDS` | `60`                    | Service default. 6 seconds per token, above the 5 second floor WR-4 needs; WR-4 waits this long before each burst. |

Override any of them from the shell before `docker compose up`; then export the same values
into the run inputs below.

## Run inputs for `tests/release`

| Run input                              | Produced from this stack                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KM_RELEASE_BASE_URL`                  | `http://localhost:8080` (the `proxy` service).                                                                                                                                                                                                                                                                                                                                                       |
| `KM_RELEASE_STATIC_URL`                | `http://127.0.0.1:8081` (the `web` service, no proxy).                                                                                                                                                                                                                                                                                                                                               |
| `KM_RELEASE_TOKEN_TTL_SECONDS`         | The value of `KM_TOKEN_TTL_SECONDS` above: `600`.                                                                                                                                                                                                                                                                                                                                                    |
| `KM_RELEASE_RATE_LIMIT_BURST`          | The value of `KM_RATE_LIMIT_BURST` above: `10`.                                                                                                                                                                                                                                                                                                                                                      |
| `KM_RELEASE_RATE_LIMIT_REFILL_SECONDS` | The value of `KM_RATE_LIMIT_REFILL_SECONDS` above: `60`.                                                                                                                                                                                                                                                                                                                                             |
| `KM_RELEASE_CSP_FILE`                  | Not from the stack. Build on the host with the same URL: `KM_LIVEKIT_URL="$LIVEKIT_URL" pnpm --filter @know-meet/web run build:hosted`, then `KM_RELEASE_CSP_FILE="$PWD/apps/web/dist-hosted-csp.txt"`. The image's bundle and this file come from the same inputs, so they carry the same policy.                                                                                                   |
| `KM_RELEASE_DEFAULT_BUILD_URL`         | Not from the stack. The default build of the same commit: `pnpm --filter @know-meet/web run build`, then `pnpm --filter @know-meet/web preview --host 127.0.0.1 --port 4173 --strictPort` (Vite preview on `http://127.0.0.1:4173`). The default build runs only after both images are built and scanned, so it cannot enter an image; the preview runs in the background for the packaged run only. |
| `KM_RELEASE_IMAGE_DIGESTS`             | Locally built images have an image ID, not a registry digest: `docker image inspect know-meet-web:boundary know-meet-livekit:boundary --format '{{index .RepoTags 0}}={{.Id}}' \| paste -sd, -`. For the pushed images use the `digests` output of the `images` workflow run.                                                                                                                        |
| `KM_EVIDENCE_DIR`                      | Chosen by the runner; see `tests/release/README.md`.                                                                                                                                                                                                                                                                                                                                                 |

## Build-time pins

The workflow `.github/workflows/images.yml` builds the same two Dockerfiles with the repository
variable `KM_LIVEKIT_URL` as the same build argument, scans both images and pushes them tagged
with the commit SHA.

## Boundary order

The release boundary (`wr09-release-boundary`, contract amendment 2, signed 2026-11-16) runs
in this order. `boundaryPacket.commands` in the adopted contract is the authority.

1. `pnpm install --frozen-lockfile`, then the static gates: `pnpm run lint`,
   `pnpm run typecheck`, `pnpm run test`, `cargo check --workspace`.
2. `pnpm --filter @know-meet/web run build:hosted`.
3. `node tooling/release/src/render-gateway-headers.ts`, then the one-file commit of
   `infra/k8s/overlays/production/security-headers.yaml`, then
   `node tooling/release/src/render-gateway-headers.ts --check`. The commit after it is the
   tested commit (`KM_TESTED_COMMIT`). If a repeat run renders an identical file, there is
   nothing to commit and the step is recorded as skipped.
4. `docker compose -f tooling/release/compose.yaml build`.
5. `node tooling/release/src/scan-artifacts.ts`. It takes no `--manifests`: it renders the
   production overlay itself and scans that render. It runs twice: here, on the tested
   commit, and again on `main` after the tag pin.
6. `docker compose -f tooling/release/compose.yaml up -d --wait`, then
   `pnpm --filter @know-meet/web run build` (the default build), then the preview command
   above, then `pnpm --filter @know-meet/release-tests exec playwright test --project=packaged`,
   then `docker compose -f tooling/release/compose.yaml down`.
7. Second operator approval. Nothing is pushed or merged, and no cluster command runs,
   before the packaged run passes and this approval is given.
8. Push the release branch and merge its pull request; the images workflow; the tag-pin
   pull request. Then `git fetch origin main`, a `git diff --exit-code` of the tested
   commit against `origin/main` that excludes
   `infra/k8s/overlays/production/kustomization.yaml`, and the second `scan-artifacts.ts` run.
9. `verify-cluster.ts --context gke_knowme-corporate_us-south1_main --json ...` (below).
10. `kubectl --context gke_knowme-corporate_us-south1_main apply -f infra/argocd/know-meet.yaml`,
    then two `kubectl --context ... -n argocd wait applications.argoproj.io/know-meet`
    commands: `{.status.sync.status}`=Synced, then `{.status.health.status}`=Healthy. No
    `argocd` CLI, login or port-forward is used.
11. `verify-endpoint.ts --host meet.know-me.tools --allow-staging --json ...` (staging check).
12. The operator merges the issuer pull request (`KM_ISSUER_COMMIT`). Two more `kubectl wait`
    commands follow: `{.status.sync.revision}` equal to `"$KM_ISSUER_COMMIT"`, then
    `{.status.health.status}`=Healthy.
13. `verify-endpoint.ts --host meet.know-me.tools --csp-file apps/web/dist-hosted-csp.txt
    --json ...` (production check), then
    `pnpm --filter @know-meet/release-tests exec playwright test --project=hosted`.

## Release verification tools

OpenSpec change `wr08-cluster-manifests`, task 8.5. Two read-only checks run by the release
boundary (`wr09-release-boundary`): `verify-cluster` runs once before the apply, and
`verify-endpoint` runs twice after Argo CD reports healthy, first with `--allow-staging`, then
against the production certificate.
Neither changes anything: no cluster object is created, changed or deleted, no DNS record is
touched, and no Secret value is read. Both use only Node built-ins plus `kubectl` for the first.
Under the VLBV method neither has been run before the boundary run.

Both print one line per check (`PASS`, `FAIL`, `INCOMPLETE`, `INFO`, `SKIP`, then the check id
and a short detail) and a `SUMMARY` line, and take `--json <path>` to write the same results as
a JSON report for the evidence folder. Exit codes:

| Code | Meaning                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Every check passed.                                                                                                                                                                                             |
| 1    | At least one check failed: the cluster or endpoint differs from what the manifests need.                                                                                                                        |
| 2    | A check could not be completed (kubectl missing, no credentials, cluster or network unreachable, timeout), or the command line, `--csp-file` or `--json` path was wrong. Wins over 1: nothing can be certified. |

### `verify-cluster.ts`: before the apply

```bash
node tooling/release/src/verify-cluster.ts --context gke_knowme-corporate_us-south1_main \
  --json "$KM_EVIDENCE_DIR/verify-cluster.json"
```

`--context` is required; without it the tool refuses to run. It spawns only `kubectl` with an
argument array (never a shell), the explicit `--context`, `--request-timeout=30s` and the verb
`get` or `api-versions`. The JSON report lists every argv it spawned (`kubectlCalls`).

| Check id                                                                                       | Passes when                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cluster-api`                                                                                  | `kubectl api-versions` answers. If not, nothing else is run (exit 2).                                                                                                                                                                                                                                                   |
| `gateway-api-v1`                                                                               | `gateway.networking.k8s.io/v1` is in the served API versions.                                                                                                                                                                                                                                                           |
| `envoy-gateway-controller`                                                                     | A Deployment in `envoy-gateway-system` runs an `envoyproxy/gateway` image with tag `v1.10.0` and all wanted replicas ready.                                                                                                                                                                                             |
| `cluster-issuer-letsencrypt-staging`, `cluster-issuer-letsencrypt-prod`                        | The ClusterIssuer exists and its `Ready` condition is `True`.                                                                                                                                                                                                                                                           |
| `external-dns`                                                                                 | A Deployment in `external-dns` runs an external-dns image, ready. `external-dns-sources` (info) lists its `--source=` values.                                                                                                                                                                                           |
| `argocd`                                                                                       | Every Deployment and StatefulSet in `argocd` is ready, and there is at least one.                                                                                                                                                                                                                                       |
| `namespace-know-meet`, `secret-know-meet-livekit`, `secret-keys`                               | Namespace `know-meet` exists, Secret `know-meet-livekit` is in it, and it has the key names `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. A failure says which of namespace, Secret or key is missing.                                                                                                        |
| `existing-gatewayclasses`, `existing-gateways`, `existing-httproutes`, `existing-certificates` | Always `INFO`: what already exists. No GatewayClass is required before the apply.                                                                                                                                                                                                                                       |
| `hostname-conflicts`                                                                           | No existing object collides with `meet.know-me.tools` (rules in the header of `src/verify/cluster-routing.ts`: an existing `main-gateway` with another hostname, another Gateway or an HTTPRoute outside `know-meet` covering the host, or a route in `know-meet` or attached to `main-gateway` with another hostname). |

**Secret handling.** The Secret is read in three steps, none of which prints a value: the
namespace list (`-o name`), the Secret list of the namespace (`-o name`), then one named Secret
through a Go template that ranges over `.data` binding each value to a variable the template
never mentions, so its output is key names only. A jsonpath over `.data` was rejected because
one wrong expression prints values. The code refuses to build any argument list that names a
Secret and is neither `-o name` nor that template. Consequences: the kubectl process receives
the whole Secret object from the API server (not confirmed whether a named get can avoid that),
but the values never reach this tool's stdout or report, and an empty value cannot be
detected, because that would need the value or its length. kubectl's own stderr is not
echoed, since it can carry account names; failures print fixed wording only.

**Ordering.** A Secret needs its namespace, so the operator creates the namespace `know-meet`
with `kubectl --context gke_knowme-corporate_us-south1_main create namespace know-meet`, then
the Secret `know-meet-livekit` in it, before `verify-cluster` runs (runbook section 3.3). No
value is printed, passed as an argument or written to a file. `verify-cluster` runs before the
apply; Argo CD then takes over the namespace. Without the operator's namespace and Secret,
`namespace-know-meet` and `secret-know-meet-livekit` fail with exit 1.

### `verify-endpoint.ts`: after Argo CD reports healthy

This is the production form, run after the issuer merge. The staging check runs earlier with
`--allow-staging` and without `--csp-file`.

```bash
node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools \
  --csp-file apps/web/dist-hosted-csp.txt --json "$KM_EVIDENCE_DIR/verify-endpoint.json"
```

`--host` takes one bare hostname (two or more labels, no scheme, path, port, credentials or IP
literal). `--csp-file` makes the CSP header have to equal the file's content byte for byte
(the file `apps/web/scripts/csp-artifact.ts` writes, without a trailing newline; only a
trailing newline in the file is ignored). `--allow-staging` (off by default) reports a Let's
Encrypt staging certificate as `INFO` instead of `FAIL`, for the staging-first step.

| Check id                       | Passes when                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dns`                          | The name resolves to at least one address. If not, the network checks are skipped.                                                                                                                                                                                                                                                                                                                  |
| `tls-identity`, `tls-validity` | The certificate names the host, and now is inside its validity period.                                                                                                                                                                                                                                                                                                                              |
| `tls-issuer`                   | The issuer Organization is `Let's Encrypt`, no name on the presented chain contains `(STAGING)`, and the chain is trusted.                                                                                                                                                                                                                                                                          |
| `tls-chain-trusted`            | Node's root store verifies the chain for the host.                                                                                                                                                                                                                                                                                                                                                  |
| `http-redirect`                | `http://<host>/` answers 301, 302, 303, 307 or 308 with a `Location` of `https://<host>` (default port). Not followed.                                                                                                                                                                                                                                                                              |
| `https-root`, `https-healthz`  | `GET /` and `GET /api/healthz` return 200 and carry the WR-3 headers: Strict-Transport-Security with a positive max-age, Content-Security-Policy (equal to `--csp-file` when given), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`, Referrer-Policy, and a Permissions-Policy whose `camera` and `microphone` allow only `self` or `"https://<host>"`. |

The header rules mirror `tests/release/src/header-checks.ts` (WR-3) and must be kept in step
with it. Response headers are printed (`HEADER <request> <name>: <value>`) and kept in the JSON
report; `Set-Cookie` is only counted, and no body is ever read. The https probes accept any
certificate, so a certificate problem shows once, in the `tls-*` checks, and cannot hide a
header problem. Every network call has a 10 second timeout; a timeout or a resolver outage is
`INCOMPLETE` (exit 2), while a name that does not resolve, a refused connection or a bad
certificate is `FAIL` (exit 1).

**Production or staging.** Let's Encrypt marks every staging root and intermediate with
`(STAGING)` in the name, and the staging roots are in no public trust store; production leaf
certificates come from an intermediate whose Organization is `Let's Encrypt`. The tool calls a
certificate staging when any issuer name on the presented chain contains `(STAGING)`, and
production only when the issuer Organization is `Let's Encrypt` and the chain is trusted.
Intermediate common names (R10 to R14, E5 to E9, YE1 to YE3, YR1 to YR3) are deliberately not
pinned, because Let's Encrypt rotates them. Sources: `letsencrypt.org/docs/staging-environment`
and `letsencrypt.org/certificates`, read 2026-11-15.
