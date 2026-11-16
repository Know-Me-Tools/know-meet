# Web release runbook: from the local run to a live certificate

Operator runbook for the first release of the Know Meet web app at
`https://meet.know-me.tools`. OpenSpec change `wr08-cluster-manifests`, task 8.4.
It covers sections 1 to 4 in the order the operator does them. DNS (5),
the certificate (6), rotation (7), rollback (8), teardown (9) and
troubleshooting (10) continue in
[`web-release-operations.md`](web-release-operations.md).

The boundary packet, its approvals and its stop conditions are in the adopted
contract (`.kbd-orchestrator/phases/web-release/adopted-contract.json`,
`boundaryPacket`). This runbook does not replace it. Where the two differ, the
contract wins and the difference is listed under "Open points" at the end.

## Labels used on every step

| Label | Meaning |
|---|---|
| **[read-only]** | Reads state. Anyone may run it at any time. |
| **[account, operator-only]** | Changes a GitHub, GHCR, LiveKit or Cloudflare account setting. The operator does it. |
| **[account, operator-only, approval 2]** | A merge to `main` or an account setting that is allowed only after the second operator approval. |
| **[cluster, operator-only, approval 2]** | Changes the cluster. Allowed only after the second operator approval described in section 2. |

## Fixed names

| Thing | Name |
|---|---|
| kubectl context | `gke_knowme-corporate_us-south1_main` |
| Namespace | `know-meet` |
| Runtime Secret | `know-meet-livekit` in `know-meet`, keys `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Deployments | `know-meet-web`, `know-meet-token-service` |
| Gateway | `main-gateway` in `envoy-gateway-system`, GatewayClass `eg` |
| TLS Secret | `meet-know-me-tools-tls` in `envoy-gateway-system` |
| ClusterIssuers | `letsencrypt-staging`, then `letsencrypt-prod` (DNS-01 through Cloudflare) |
| Argo CD Application | `know-meet` in `argocd`, file `infra/argocd/know-meet.yaml` |
| Source | `https://github.com/Know-Me-Tools/know-meet.git`, path `infra/k8s/overlays/production`, branch `main` |
| Images | `ghcr.io/know-me-tools/know-meet-web`, `ghcr.io/know-me-tools/know-meet-token-service`, tag = commit SHA |
| Repository variable | `KM_LIVEKIT_URL` (public `wss://` URL, not a secret) |
| Hostname | `meet.know-me.tools`, and no other |

The commands below use one shell variable for the context. It holds no secret:

```bash
KCTX=gke_knowme-corporate_us-south1_main
```

## Secret handling rules

These apply to every step in both files.

- `LIVEKIT_*`, `CF_TOKEN` and `KNOWME_ARGOCD_*` are referred to by name only.
  No value goes into argv, shell history, a file in the repository, a file on
  disk, a ticket, a chat or terminal output.
- Never run `kubectl get secret ... -o yaml`, `-o json` or `-o jsonpath` on
  `.data`. Those print the values (base64 is not protection).
- Never use `kubectl apply` for a Secret that holds a value. It stores the
  whole object, values included, in the `last-applied-configuration`
  annotation. Use `kubectl create` and, for updates, `kubectl replace`.
- Turn off shell tracing (`set +o xtrace`) before any line that expands a
  secret variable. Tracing prints expanded arguments of builtins too.
- Do not screen-share or record the terminal while handling secrets.
- Playwright traces from the hosted run hold short-lived tokens. Do not
  publish raw traces.

---

## 1. Before the boundary run

Nothing here is pushed, merged or sent to the cluster. Those, and every
account change except 1.2, come after the second approval (section 2).

### 1.1 Confirm whether the repository is public [read-only]

`analysis.md` (finding 5) records the repository as public; no file proves
it. Check it:

```bash
gh repo view Know-Me-Tools/know-meet --json visibility --jq .visibility
```

- `PUBLIC`: Argo CD needs no credential (section 4.1, branch A). GHCR
  packages can be public, so the cluster needs no pull secret.
- `PRIVATE` or `INTERNAL`: Argo CD needs a repository connection (section
  4.1, branch B). A private repository does not stop the packages from being
  public, but decide that on purpose.

### 1.2 Set the repository variable `KM_LIVEKIT_URL` [account, operator-only]

The images workflow (`.github/workflows/images.yml`) bakes this URL into the
web bundle and its CSP. The first step of the workflow fails if the variable
is missing or is not a bare `wss://host[:port]` origin (no path, no trailing
slash). It must be the same URL as the `LIVEKIT_URL` key of the runtime
Secret in section 3, and the same as `LIVEKIT_URL` in the shell that builds
the packaged images; a difference stops the run.

The URL is public. It is not a secret, so `--body` is acceptable here:

```bash
gh variable set KM_LIVEKIT_URL --repo Know-Me-Tools/know-meet --body 'wss://<your-project>.livekit.cloud'
gh variable list --repo Know-Me-Tools/know-meet          # [read-only] confirm it is listed
```

Replace `<your-project>` with the project host shown in the LiveKit Cloud
dashboard. Do not use `gh secret set` for it: the workflow reads `vars.`, not
`secrets.`.

### 1.3 Commit the work on the release branch

At the operator's request, wr01 to wr08 (tasks 8.1 to 8.5) are committed on
`feat/web-release`, not pushed. The tag pin (task 8.6) is not included.

### 1.4 The local part of the run (first approval)

The first approval starts the single run. It covers these steps (from
`boundaryPacket.commands`, in order), the reviews and one commit of the
generated `security-headers.yaml`; no push, merge or cluster command:

1. `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm run typecheck`,
   `pnpm run test`, `cargo check --workspace`.
2. `pnpm --filter @know-meet/web run build:hosted`.
3. `node tooling/release/src/render-gateway-headers.ts`, then
   `git commit --only infra/k8s/overlays/production/security-headers.yaml -m "chore(release): render gateway security headers"`,
   then `node tooling/release/src/render-gateway-headers.ts --check`. The
   result is the tested commit, `KM_TESTED_COMMIT` (a no-change render is
   recorded as a skipped commit).
4. `docker compose -f tooling/release/compose.yaml build`, then
   `node tooling/release/src/scan-artifacts.ts`.
5. `docker compose -f tooling/release/compose.yaml up -d --wait`, the default
   build and its preview on `127.0.0.1:4173`, the packaged run
   (`pnpm --filter @know-meet/release-tests exec playwright test --project=packaged`),
   then `docker compose -f tooling/release/compose.yaml down` and stop the
   preview. Then the accessibility, UI and security reviews.

If the packaged run fails, the run stops and no cluster command runs. It
tests locally built images, not the deployed ones (Open point 1).

---

## 2. The second approval point, then publishing

The packaged run and the reviews have passed. Nothing is pushed, merged or in
the cluster. The lead asks for the second approval and shows the reviewed
HTTPRoute hostname, as the contract requires.

### 2.1 What the operator is shown [read-only]

The lead renders the manifests of the tested commit locally and shows every
line that names a host:

```bash
kubectl kustomize infra/k8s/overlays/production | grep -n -i -E 'hostname|dnsNames|know-me\.tools'
```

Expected: every hostname is exactly `meet.know-me.tools`: HTTPRoute
`hostnames`, the Gateway listener `hostname` and the Certificate `dnsNames`.
Any other name, or a wildcard, is a stop condition. Do not approve.

The lead also shows the issuer on the Certificate (`letsencrypt-staging` for
the first sync) and the packaged run verdicts. The image tags are still
placeholders; the tag pin comes after publishing (2.6).

### 2.2 What the operator is approving

Approving starts changes that are public, and some of them are not undone by
reverting Git:

- In order: push and merge of the release branch, the images workflow, public
  GHCR packages, a LiveKit spending control and the tag pin (2.3 to 2.6).
- A public DNS A record for `meet.know-me.tools` in Cloudflare. external-dns
  runs with `--policy=upsert-only` and never deletes it.
- A public load balancer address for `main-gateway`. It is the first
  LoadBalancer Service in the cluster and is billed.
- A cluster-scoped GatewayClass `eg` and the shared Gateway `main-gateway`,
  which other applications may later attach routes to.
- Let's Encrypt certificates for the hostname. Certificate Transparency logs
  make the hostname public permanently.
- A public token endpoint that spends LiveKit Cloud minutes.
- The cluster commands of sections 3 to 6 (5 and 6 are in
  `web-release-operations.md`), in that order.

The approval does not cover any other hostname, any change to the Envoy
Gateway, cert-manager, external-dns or Argo CD installations, or any second
run after the repair budget is spent.

### 2.3 Push the release branch and merge it [account, operator-only, approval 2]

The lead pushes `feat/web-release` and opens its pull request; the operator
merges it. The merge to `main` starts the `images` workflow, which builds and
pushes both images tagged with the merge commit SHA. To start it by hand:
`gh workflow run images.yml --repo Know-Me-Tools/know-meet --ref main`.

Wait for it to pass. Record from the job summary or the artifact
`image-digests-<sha>` the commit SHA (the image tag), both digests and the
run URL, for the evidence folder, the tag-pin pull request and WR-7 (4.4).

If the pull-request checks or the images workflow fail, the run stops. A
repair is a new commit, consumes a repair attempt and repeats the packaged
run on the new tested commit. The workflow refuses to push an existing tag.

### 2.4 Make both GHCR packages public [account, operator-only, approval 2]

The packages `know-meet-web` and `know-meet-token-service` exist only after
the first `images` run (2.3). For each: GitHub, organisation
`Know-Me-Tools`, **Packages**, the package, **Package settings**, **Danger
Zone**, **Change visibility**, **Public**. A public package cannot be made
private again. No `gh` command for this was confirmed; use the web UI.

Check [read-only]. This REST path was not confirmed against GitHub's
documentation in this session; the token needs the `read:packages` scope:

```bash
gh api /orgs/Know-Me-Tools/packages/container/know-meet-web --jq .visibility
gh api /orgs/Know-Me-Tools/packages/container/know-meet-token-service --jq .visibility
```

Both should print `public`. If you keep them private instead, the cluster
needs an image pull secret, which the manifests do not have.

### 2.5 Set a spending control on the LiveKit Cloud project [account, operator-only, approval 2]

The public token endpoint lets anyone spend the project's minutes. Set an
alert or limit in the LiveKit Cloud dashboard. The billing page read for this
runbook (`docs.livekit.io/deploy/admin/billing/`) describes no spending
alert; if there is none, record what you used instead (plan quota, project
limits under **Settings**, **Project**, or a scheduled usage review) in the
decision log. This step is not done without a recorded control.

### 2.6 The tag-pin pull request (task 8.6) [account, operator-only, approval 2]

Prepared by the lead, merged by the operator. It changes only the two
`newTag` lines in `infra/k8s/overlays/production/kustomization.yaml`, both to
the SHA from 2.3. The CSP header is already committed (1.4, step 3). Before
merging [read-only]:

```bash
kubectl kustomize infra/k8s/overlays/production | grep -n -E 'image:|Content-Security-Policy'
```

Every `image:` line ends in `:<sha from 2.3>`. Merge. Changes under
`infra/**` do not start the images workflow. The cluster commands run from
`main` at this commit.

### 2.7 Identity check [read-only, boundary runner]

```bash
git fetch origin main
git diff --exit-code "$KM_TESTED_COMMIT" origin/main -- . ":(exclude)infra/k8s/overlays/production/kustomization.yaml"
node tooling/release/src/scan-artifacts.ts
```

The diff must be empty: `main` equals the tested commit except the production
`kustomization.yaml`, which may differ only in the two `newTag` lines. Any
other difference stops the run. The scan then runs again on `main`.

---

## 3. Create the runtime Secret

### 3.1 Ordering: namespace, then Secret, then the Application

The namespace `know-meet` is defined in Git and synced by Argo CD. The Secret
cannot be created before the namespace exists, and the token service does not
start without the Secret. The contract also has `verify-cluster` confirm the
Secret by name **before** the `kubectl apply` of the Application. So the
namespace has to exist before Argo CD syncs.

The contract (amendment 2) fixes this order:

1. Operator creates the namespace by hand (3.2).
2. Operator creates the Secret in it (3.3) and checks it (3.4).
3. `verify-cluster` runs and finds the Secret.
4. The Application is applied. Argo CD finds the namespace already there and
   takes it over (it applies the Namespace manifest from Git onto it).

What the operator sees in between: after steps 1 and 2 the namespace holds
only the Secret (and the default ServiceAccount and the `kube-root-ca.crt`
ConfigMap Kubernetes adds). No pod runs. Nothing is public yet. Argo CD shows
nothing, because no Application exists.

Consequence of this order: once Argo CD has taken over the namespace, a
cascading delete of the Application deletes the namespace, and the Secret with
it. See teardown in `web-release-operations.md`.

### 3.2 Create the namespace [cluster, operator-only, approval 2]

```bash
kubectl --context "$KCTX" create namespace know-meet
```

The contract lists this as an operator step before `verify-cluster`. Argo CD
takes the namespace over at the apply (3.1).

### 3.3 Create the Secret with every value on stdin [cluster, operator-only, approval 2]

Run this in **bash**, not zsh: `read -p` means something else in zsh. The
macOS system bash (3.2) supports everything used here.

```bash
bash                                   # start bash if your login shell is zsh
set +o xtrace                          # tracing would print the values
KCTX=gke_knowme-corporate_us-south1_main

# Skip a line if that variable is already set in this shell.
# -s: no echo. -r: keep backslashes. Typed text is not stored in history.
read -r -s -p 'LIVEKIT_URL: '        LIVEKIT_URL;        echo
read -r -s -p 'LIVEKIT_API_KEY: '    LIVEKIT_API_KEY;    echo
read -r -s -p 'LIVEKIT_API_SECRET: ' LIVEKIT_API_SECRET; echo

kubectl --context "$KCTX" -n know-meet create secret generic know-meet-livekit \
  --from-file=LIVEKIT_URL=<(printf '%s' "$LIVEKIT_URL") \
  --from-file=LIVEKIT_API_KEY=<(printf '%s' "$LIVEKIT_API_KEY") \
  --from-file=LIVEKIT_API_SECRET=<(printf '%s' "$LIVEKIT_API_SECRET")

unset LIVEKIT_API_KEY LIVEKIT_API_SECRET   # keep LIVEKIT_URL only if you still need it
```

Expected output: `secret/know-meet-livekit created`. Nothing else.

Why this leaks nothing:

- **argv.** `printf` is a bash builtin, so no new process starts and no value
  appears in any process list. Each `<( ... )` hands kubectl a pipe path such
  as `/dev/fd/63`. kubectl's argv holds those paths, never a value.
- **History.** The history line is the literal text above, with
  `$LIVEKIT_API_SECRET` as a name. `read -s` input is not a command and is not
  recorded.
- **Files.** Process substitution uses pipes. Nothing is written to disk, in
  the repository or in `$TMPDIR`.
- **Terminal.** `read -s` does not echo. `kubectl create` prints only the
  object name.
- **Environment.** Variables set by `read` are not exported, so kubectl does
  not inherit them. If yours were already exported from a profile, kubectl
  inherits them in its environment, readable only by your own user; `unset`
  them afterwards.
- **Trailing newline.** `printf '%s'` adds none. The token service also trims
  surrounding whitespace from every variable.

Documentation status: `--from-file=<key>=<path>` with several keys is the
documented form (kubectl reference, `kubectl create secret generic`). This
cluster's recorded pattern reads a value from `/dev/stdin`, which is a pipe.
A process-substitution path is also a pipe, but reading it was not confirmed
in kubectl's documentation in this session. If kubectl rejects the
`/dev/fd/...` paths, do not fall back to one key per command: kubectl cannot
add a key to an existing Secret without putting the value in argv. Use this
fallback instead. It feeds all three lines through one stdin pipe, like the
recorded pattern, but `--from-env-file=/dev/stdin` was likewise not confirmed
in the documentation:

```bash
printf 'LIVEKIT_URL=%s\nLIVEKIT_API_KEY=%s\nLIVEKIT_API_SECRET=%s\n' \
  "$LIVEKIT_URL" "$LIVEKIT_API_KEY" "$LIVEKIT_API_SECRET" \
| kubectl --context "$KCTX" -n know-meet create secret generic know-meet-livekit \
    --from-env-file=/dev/stdin
```

Do not use a heredoc: macOS bash 3.2 writes heredocs to a temporary file.

### 3.4 Check the Secret without printing values [read-only]

```bash
kubectl --context "$KCTX" -n know-meet describe secret know-meet-livekit
```

`kubectl describe` shows each key with its size in bytes, never the value.
Expected under `Data`: exactly three keys, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`, each with a size above zero. A size of `0 bytes` means
the variable was empty: delete the Secret
(`kubectl --context "$KCTX" -n know-meet delete secret know-meet-livekit`,
[cluster, operator-only, approval 2]) and repeat 3.3.

The Secret is not in Git and carries no Argo CD tracking label or annotation,
so Argo CD never prunes or overwrites it.

---

## 4. Connect Argo CD and apply the Application

### 4.1 Repository connection

The run reads Argo CD with `kubectl` only: no port-forward, login or
password. The optional CLI is described in `web-release-operations.md`.

**Branch A: public repository (1.1 printed `PUBLIC`).** No connection is
needed. Argo CD clones public HTTPS repositories without credentials. Nothing
to create.

**Branch B: private repository** [cluster, operator-only, approval 2]. Argo
CD reads repository credentials from a Secret in `argocd` labelled
`argocd.argoproj.io/secret-type: repository` with keys `type`, `url`,
`username` and `password` (Argo CD v3.6.1 declarative setup). Use a read-only
credential: a fine-grained personal access token with read access to this
repository's contents, or a GitHub App. Do not use `argocd repo add
--password`; it puts the token in argv.

```bash
set +o xtrace
read -r -s -p 'Read-only GitHub token: ' KM_REPO_TOKEN; echo
kubectl --context "$KCTX" -n argocd create secret generic know-meet-repo \
  --from-literal=type=git \
  --from-literal=url=https://github.com/Know-Me-Tools/know-meet.git \
  --from-literal=username=x-access-token \
  --from-file=password=<(printf '%s' "$KM_REPO_TOKEN")
unset KM_REPO_TOKEN
kubectl --context "$KCTX" -n argocd label secret know-meet-repo \
  argocd.argoproj.io/secret-type=repository
argocd repo list                                   # [read-only, optional CLI] the URL shows as Successful
```

`type`, `url` and `username` are not secret, so `--from-literal` is fine for
them. The username is ignored by GitHub for token auth; any non-empty value
works.

### 4.2 Read-only cluster verification [read-only]

Run by the boundary runner, not by hand, after 3.2 to 3.4:

```bash
node tooling/release/src/verify-cluster.ts --context gke_knowme-corporate_us-south1_main --json "$KM_EVIDENCE_DIR/verify-cluster.json"
```

It confirms the Envoy Gateway controller runs v1.10.0 and serves
`gateway.networking.k8s.io/v1`, both ClusterIssuers, external-dns, Argo CD,
the namespace `know-meet` and the Secret with its three key names; no
GatewayClass is required. A difference from `cluster-context.md` that the
manifests depend on stops the run.

### 4.3 Apply the Application [cluster, operator-only, approval 2]

```bash
kubectl --context gke_knowme-corporate_us-south1_main apply -f infra/argocd/know-meet.yaml
kubectl --context gke_knowme-corporate_us-south1_main -n argocd wait applications.argoproj.io/know-meet --for=jsonpath='{.status.sync.status}'=Synced --timeout=600s
kubectl --context gke_knowme-corporate_us-south1_main -n argocd wait applications.argoproj.io/know-meet --for=jsonpath='{.status.health.status}'=Healthy --timeout=600s
```

All three are packet commands; the `--for=jsonpath` form is unverified here.

### 4.4 What Synced and Healthy look like [read-only]

```bash
kubectl --context "$KCTX" -n argocd get application know-meet \
  -o jsonpath='{.status.sync.status} {.status.health.status}{"\n"}'
kubectl --context "$KCTX" -n know-meet get deploy,pods,svc,httproute
```

Expected, in roughly this order:

1. `.status.sync.status` is `Synced` at the tag-pin commit on `main`.
2. Resources created: GatewayClass `eg`, Gateway `main-gateway`, the
   namespace (taken over), two Deployments, two Services, the HTTPRoutes and
   the Certificate.
3. Both Deployments `READY 1/1` (or the replica count in the overlay). Pods
   `Running`. The token service log starts with an `event":"starting"` line
   that lists its non-secret settings.
4. `.status.health.status` is `Healthy` once the Certificate is Ready. Argo
   CD treats a Certificate as Progressing until it is issued, so health lags
   sync by the issuance time (about 79 seconds in the recorded staging test).

Token service logs (variable names only, never values):

```bash
kubectl --context "$KCTX" -n know-meet logs deploy/know-meet-token-service --tail=50
```

WR-7 compares the running image digests in the Application with those of 2.3:

```bash
kubectl --context gke_knowme-corporate_us-south1_main -n argocd get applications.argoproj.io/know-meet -o json
```

---

## Open points

Amendment 2 (2026-11-16) settled the run order, the compose path, the
hand-made namespace, reading Argo CD with `kubectl` and the shared TLS
Secret. Still open:

1. **The packaged run does not test the deployed images.** It tests images
   built on this machine; the cluster runs images the workflow builds from the
   same tree, with different digests. WR-8 is proven only on the local
   images. Only the hosted run and WR-7 are evidence about deployed images.
2. **The run spans three operator merges** (2.3, 2.6, the issuer pull
   request) and two CI waits. Each stall spends the 1,800-minute budget.
3. **The first release has no rollback.** There is no earlier tag; the
   fallback is teardown (operations 8.1, 9).
4. **No packet command checks the excluded `kustomization.yaml`** in 2.7.
   That only the two `newTag` lines differ is confirmed by reading its diff.
5. **Not verified:** `.status.sync.revision` holds the full SHA, and health
   waits for the Certificate, on Argo CD v3.6.1; `--allow-staging` also
   relaxes the chain-trust check; `docker compose up --wait` returns promptly
   with no health checks; which workflows run when the pull request opens;
   the `kubectl wait --for=jsonpath` form against this cluster; whether
   `kbd-apply` lets `wr09` tasks 9.1 to 9.3 begin while task 8.6 is open.
6. `tooling/release/` is outside the root typecheck and CI. Unchanged: port
   gaps, control colours, manual image builds from any ref, the `ui-engineer`
   definition, `versions.toml` entries, a possible `protoc` gap in the token
   service image.
