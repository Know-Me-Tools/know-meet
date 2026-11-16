# Web release operations: DNS, certificate, rotation, rollback, teardown

Second part of the operator runbook for `https://meet.know-me.tools`
(OpenSpec change `wr08-cluster-manifests`, task 8.4). Sections 1 to 4
(preparation and the local run, the second approval and publishing, the
Secret, Argo CD) and the open points
are in [`web-release-runbook.md`](web-release-runbook.md). The labels, fixed names,
`KCTX` variable and secret handling rules defined there apply here.

| Label | Meaning |
|---|---|
| **[read-only]** | Reads state. |
| **[account, operator-only]** | Changes a GitHub, GHCR, LiveKit or Cloudflare account setting. |
| **[cluster, operator-only, approval 2]** | Changes the cluster during the release. Allowed only after the second operator approval. |
| **[cluster, operator-only, approval]** | Changes the cluster. During the release this needs the second approval in the contract. After the release, it needs the operator's explicit go-ahead for that action. |

```bash
KCTX=gke_knowme-corporate_us-south1_main
```

## The Argo CD CLI (optional, not used by the release run)

The release run reads Argo CD with `kubectl` on the Application object. The
`argocd` commands in sections 6 to 10 are for troubleshooting, rollback and
teardown. Argo CD is reachable only through a port-forward. Open one in a
separate terminal [read-only; it forwards a port and changes nothing], then
log in [read-only for the cluster; it writes a CLI context to your home
directory]:

```bash
kubectl --context "$KCTX" -n argocd port-forward svc/argocd-server 8443:443
argocd login localhost:8443 --insecure --username "$KNOWME_ARGOCD_ADMIN_USER"
```

Local port 8443 avoids a clash with the packaged stack, which publishes 8080.
Leave `--password` off; it would put the password in argv. Paste the password
at the prompt from your own store. Whether `argocd login` prompts when
`--password` is absent was not confirmed in the v3.6.1 docs in this session;
it is the documented default example (`argocd login cd.argoproj.io`).

---

## 5. DNS

### 5.1 What to expect [read-only]

external-dns watches HTTPRoutes and creates an A record for
`meet.know-me.tools` pointing at the Gateway's load balancer address. The
record is DNS-only (not proxied through Cloudflare). external-dns also writes
TXT ownership records with owner id `gke-knowme-corporate-us-south1-main`.

```bash
# The Gateway's public address (empty until the load balancer is provisioned)
kubectl --context "$KCTX" -n envoy-gateway-system get gateway main-gateway \
  -o jsonpath='{.status.addresses[*].value}{"\n"}'

# What public DNS returns
dig +short meet.know-me.tools A @1.1.1.1

# What external-dns did. List deployments first; the name below is assumed.
kubectl --context "$KCTX" -n external-dns get deploy
kubectl --context "$KCTX" -n external-dns logs deploy/external-dns --since=15m
```

Done when `dig` returns exactly the Gateway address.

Read the external-dns log for any record name other than
`meet.know-me.tools` (and its TXT ownership records). A record for any other
hostname is a stop condition.

### 5.2 How long to wait

Wait up to **10 minutes** after the Gateway has an address (contract). The
load balancer itself can take a few minutes to appear; the 10 minutes start
when the address is set.

### 5.3 Manual fallback [account, operator-only]

If `dig` still returns nothing after 10 minutes, create the record by hand in
the Cloudflare dashboard: zone `know-me.tools`, **DNS**, **Records**, **Add
record**:

| Field | Value |
|---|---|
| Type | `A` |
| Name | `meet` |
| IPv4 address | the Gateway address from 5.1 |
| Proxy status | DNS only |
| TTL | Auto |

Use the dashboard, not the API with `CF_TOKEN`, so the token is never typed.

A hand-made record has no external-dns ownership TXT record, so external-dns
will not update it. If the Gateway address ever changes, update this record
by hand. Record in the evidence folder that the fallback was used and why.

---

## 6. Certificate: staging first, then production

### 6.1 Staging issuance [read-only checks]

The first sync uses `letsencrypt-staging`. cert-manager answers the DNS-01
challenge through Cloudflare, so issuance does not wait for the A record.

```bash
kubectl --context "$KCTX" get certificate -A
kubectl --context "$KCTX" -n envoy-gateway-system describe certificate <name-from-the-list>
kubectl --context "$KCTX" -n envoy-gateway-system get certificaterequest,order,challenge
```

Done when the Certificate shows `READY True`. Confirm which issuer signed the
stored certificate. This prints only an annotation, not key material:

```bash
kubectl --context "$KCTX" -n envoy-gateway-system get secret meet-know-me-tools-tls \
  -o jsonpath='{.metadata.annotations.cert-manager\.io/issuer-name}{"\n"}'
```

Expected: `letsencrypt-staging`. The annotation key is cert-manager's issuer
annotation; its exact spelling was not re-read in the docs this session.

Check what the Gateway serves, once DNS resolves (the certificate is public
data):

```bash
openssl s_client -connect meet.know-me.tools:443 -servername meet.know-me.tools </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```

The issuer contains `STAGING`. Browsers reject this certificate, so the hosted
scenarios (WR-3 in particular) are not run against staging. The boundary
runner checks the staging endpoint [read-only]:

```bash
node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools --allow-staging --json "$KM_EVIDENCE_DIR/verify-endpoint-staging.json"
```

Whether `--allow-staging` also relaxes the chain-trust check is not verified.

### 6.2 Switch to production [account, operator-only, approval 2; then Argo CD syncs]

After the staging check, the lead prepares a one-line pull request: in
`infra/platform/certificate.yaml`, `spec.issuerRef.name` changes from
`letsencrypt-staging` to `letsencrypt-prod`. The operator merges it. Its
merge commit is `KM_ISSUER_COMMIT`, recorded in the evidence folder. A pull
request that changes anything else is a stop condition. It is under
`infra/**`, so no image build starts.

The Application has automated sync (`infra/argocd/know-meet.yaml`), so
Argo CD applies the change by itself. The boundary runner waits for the new
revision and for health:

```bash
kubectl --context gke_knowme-corporate_us-south1_main -n argocd wait applications.argoproj.io/know-meet --for=jsonpath='{.status.sync.revision}'="$KM_ISSUER_COMMIT" --timeout=600s
kubectl --context gke_knowme-corporate_us-south1_main -n argocd wait applications.argoproj.io/know-meet --for=jsonpath='{.status.health.status}'=Healthy --timeout=600s
```

That `.status.sync.revision` holds the full commit SHA was not verified.
cert-manager re-issues into the same Secret: its documented rule is that the
issuance runs again when the issuer annotations on the Secret do not match
the issuer on the Certificate. The boundary runner waits, by the read-only
annotation get in 6.1, until it reads `letsencrypt-prod`. The `openssl`
issuer then no longer contains `STAGING`.

### 6.3 Production endpoint check and the hosted run [read-only]

Run by the boundary runner, in this order:

```bash
node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools --csp-file apps/web/dist-hosted-csp.txt --json "$KM_EVIDENCE_DIR/verify-endpoint.json"
pnpm --filter @know-meet/release-tests exec playwright test --project=hosted
```

`verify-endpoint` compares the CSP byte for byte, which is stricter than the
WR-3 test: a whitespace-only difference fails the tool while the test passes.

**Do not delete `meet-know-me-tools-tls`.** Staging and production share it:
production issuance overwrote the staging certificate in place, and deleting
the Secret would take TLS away from the Gateway until cert-manager re-issues.
There is no staging Secret to clean up. Record in the evidence folder the
issuer on the Secret and the issuer the endpoint serves.

---

## 7. Rotation

### 7.1 What reads what

| Value | Read by | Read when | Change takes effect after |
|---|---|---|---|
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | token service, from the Secret as environment variables | process start | a restart of `know-meet-token-service` |
| `LIVEKIT_URL` (Secret key) | token service, returned to clients | process start | a restart of `know-meet-token-service` |
| `KM_LIVEKIT_URL` (repository variable) | the web image build, baked into the bundle and its CSP | image build | new images, a tag-pin pull request and a regenerated header file |

Kubernetes does not update environment variables in running pods when a
Secret changes. The pods have to be replaced.

### 7.2 Rotate the LiveKit API key and secret (same project)

1. **[account, operator-only]** In the LiveKit Cloud dashboard, create a new
   API key and secret for the project. Keep the old key for now.
2. **[cluster, operator-only, approval]** Replace the Secret. Run in bash,
   with tracing off. The pipe carries the object, values included, from the
   first kubectl to the second; nothing reaches the terminal or a file.
   `kubectl replace` does not add the `last-applied-configuration`
   annotation that `kubectl apply` would.

   ```bash
   bash
   set +o xtrace
   KCTX=gke_knowme-corporate_us-south1_main
   read -r -s -p 'LIVEKIT_URL: '        LIVEKIT_URL;        echo
   read -r -s -p 'LIVEKIT_API_KEY: '    LIVEKIT_API_KEY;    echo
   read -r -s -p 'LIVEKIT_API_SECRET: ' LIVEKIT_API_SECRET; echo

   kubectl --context "$KCTX" -n know-meet create secret generic know-meet-livekit \
     --from-file=LIVEKIT_URL=<(printf '%s' "$LIVEKIT_URL") \
     --from-file=LIVEKIT_API_KEY=<(printf '%s' "$LIVEKIT_API_KEY") \
     --from-file=LIVEKIT_API_SECRET=<(printf '%s' "$LIVEKIT_API_SECRET") \
     --dry-run=client -o yaml \
   | kubectl --context "$KCTX" -n know-meet replace -f -

   unset LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET
   ```

   Expected output: `secret/know-meet-livekit replaced`. Never add `| tee`
   or redirect the first command to a file: its output contains the values.
   Same documentation caveat as section 3.3 of the runbook for the
   `/dev/fd/...` paths.
3. **[read-only]** `kubectl --context "$KCTX" -n know-meet describe secret know-meet-livekit`
   shows three keys with non-zero sizes.
4. **[cluster, operator-only, approval]** Restart the token service. The web
   Deployment does not need a restart; it holds no key.

   ```bash
   kubectl --context "$KCTX" -n know-meet rollout restart deployment/know-meet-token-service
   kubectl --context "$KCTX" -n know-meet rollout status deployment/know-meet-token-service --watch=true
   ```

   The restart adds an annotation to the pod template that is not in Git.
   Argo CD normally ignores fields it did not set; if it reports OutOfSync
   after a restart, this annotation is the reason.
5. **[read-only]** Join a meeting at the public URL, or run the hosted WR-1
   scenario. `/api/healthz` does not use the key, so a 200 from it proves
   nothing about the rotation.
6. **[account, operator-only]** Wait at least the token lifetime
   (`KM_TOKEN_TTL_SECONDS`, 600 seconds by default) so tokens signed with the
   old key expire, then delete the old key in LiveKit Cloud.

### 7.3 Move to a different LiveKit project or URL

The URL is baked into the web image and its CSP, so a Secret change alone
breaks the site (the browser's CSP blocks the new `wss://` origin).

1. **[account, operator-only]** Set `KM_LIVEKIT_URL` to the new URL (runbook
   1.2).
2. A commit with application changes, or `gh workflow run images.yml --ref main`,
   builds new images. Record the new SHA.
3. A tag-pin pull request pins the new SHA and carries the header file
   regenerated from the new CSP artifact. Run the header file check.
4. **[cluster, operator-only, approval]** Replace the Secret with the new
   URL, key and secret (7.2 step 2) just before merging, so the token service
   restarted by the rollout reads the new values.
5. Merge. Argo CD rolls both Deployments to the new images.

### 7.4 Rotate the Argo CD repository credential (private repository only)

**[cluster, operator-only, approval]** Same pattern as 7.2 step 2 for the
Secret `know-meet-repo` in `argocd`: create with `--dry-run=client -o yaml`,
pipe to `kubectl replace -f -`. The `argocd.argoproj.io/secret-type` label is
lost by `replace`, because the dry-run object has no labels; label it again
afterwards (runbook 4.1). Then revoke the old token in GitHub.

---

## 8. Rollback

### 8.1 How

Rollback is a Git revert of the tag-pin commit, merged to `main`.

1. **[account, operator-only]** Revert the merged tag-pin pull request (the
   **Revert** button on the pull request, or `git revert <tag-pin-commit>` on
   a branch and a new pull request). Merge it. It touches only `infra/**`, so
   no image build starts.
2. Argo CD applies the previous image tags. With automated sync it does this
   at its next poll; otherwise **[cluster, operator-only, approval]**
   `argocd app sync know-meet`.
3. The Deployments roll back to the previous images. The previous images are
   still in GHCR, because tags are never reused or deleted by the workflow.
4. **[read-only]** `argocd app get know-meet` shows Synced to the revert
   commit; `kubectl --context "$KCTX" -n know-meet get pods -o wide` shows new
   pods on the old tag.

If the same pull request also changed the header file, the revert restores
the header that matches the old images. That is what you want.

Do not roll back with `kubectl rollout undo` or `kubectl set image`. Argo CD
either reverts it (self-heal) or reports drift, and Git no longer describes
what runs.

**First release:** reverting the first tag-pin commit restores the
placeholder tag, so the pods cannot pull an image. There is no earlier good
version. For the first release, "rollback" means taking the site down
(section 9) or removing the route, not a revert.

### 8.2 What is not rolled back

| Thing | Why it stays |
|---|---|
| The DNS A record and external-dns TXT records | external-dns is `upsert-only` and never deletes. |
| The certificate in `meet-know-me-tools-tls` | A revert of the image tag does not touch it. |
| The shared Gateway `main-gateway`, GatewayClass `eg` and the load balancer address | Still in Git; other applications may depend on them. |
| The `know-meet-livekit` Secret | Not in Git. |
| The `KM_LIVEKIT_URL` variable and GHCR visibility | Account settings. |
| LiveKit minutes already spent | Billing. |

---

## 9. Teardown

Removes Know Meet from the cluster and from DNS. Every step is
operator-only.

### 9.1 Check what else uses the shared Gateway [read-only]

```bash
kubectl --context "$KCTX" get httproute,grpcroute,tlsroute -A
kubectl --context "$KCTX" get gateway -A
```

Look for routes outside `know-meet` whose parent is `main-gateway`, and for
other Gateways using class `eg`.

### 9.2 Remove the workloads [cluster, operator-only, approval]

Log in to Argo CD first ("The Argo CD CLI" above: port-forward, then
`argocd login`).

**Case A: nothing else uses `main-gateway` or `eg`.**

```bash
argocd app delete know-meet --cascade
```

`--cascade` (the default) deletes every resource the Application manages: the
namespace (taken over in runbook 3.1, so the Secret goes with it), the
Deployments, Services, HTTPRoutes, the Certificate, the Gateway (its load
balancer address is released) and the GatewayClass.

**Case B: other applications use the Gateway or the class.** Do not cascade.
First move `main-gateway` and GatewayClass `eg` out of the `know-meet`
Application by a Git change (into a platform Application of their own) and
let both Applications sync. Then run Case A: only Know Meet resources remain
under `know-meet`. If that is not possible in time:

```bash
argocd app delete know-meet --cascade=false
kubectl --context "$KCTX" delete namespace know-meet
kubectl --context "$KCTX" -n envoy-gateway-system get certificate     # then delete the Know Meet one by name
```

`--cascade=false` leaves every resource in place, unmanaged. Deleting the
namespace removes the workloads, the Secret and the routes in it. The
Gateway, the class and the load balancer stay. Delete the Know Meet
Certificate by name; never delete the Gateway in Case B.

### 9.3 Remove the TLS Secret [cluster, operator-only, approval]

cert-manager does not delete a Certificate's Secret by default.

```bash
kubectl --context "$KCTX" -n envoy-gateway-system delete secret meet-know-me-tools-tls
```

### 9.4 Remove the DNS records [account, operator-only]

external-dns never deletes. In the Cloudflare dashboard, zone
`know-me.tools`, **DNS**, **Records**, delete:

- the `A` record `meet.know-me.tools`
- the external-dns TXT ownership records for that name: TXT records whose
  name contains `meet` and whose content contains
  `heritage=external-dns,external-dns/owner=gke-knowme-corporate-us-south1-main`
- any leftover `_acme-challenge.meet` TXT record (cert-manager normally
  removes these itself)

Delete nothing else. The token covers eight other zones; teardown touches
only `know-me.tools` and only these names.

### 9.5 Remove the remaining pieces

- **[cluster, operator-only, approval]** Private repository only:
  `kubectl --context "$KCTX" -n argocd delete secret know-meet-repo`.
- **[account, operator-only]** Revoke the LiveKit API key in LiveKit Cloud,
  and the repository token in GitHub if one was made.
- **[account, operator-only]** GHCR packages: keep them (rollback needs
  them) or delete them under **Package settings**, **Danger Zone**.
- Stop the port-forward.

### 9.6 Confirm [read-only]

```bash
kubectl --context "$KCTX" get namespace know-meet               # NotFound
kubectl --context "$KCTX" -n argocd get application know-meet   # NotFound
kubectl --context "$KCTX" -n envoy-gateway-system get svc       # Case A: no LoadBalancer left
dig +short meet.know-me.tools A @1.1.1.1                        # empty, after the TTL
```

---

## 10. What can go wrong

| Symptom | Likely cause | Check [read-only] | Fix |
|---|---|---|---|
| `verify-cluster` stops on the Secret; or token service pods in `CreateContainerConfigError` | `know-meet-livekit` missing, or in another namespace | `kubectl --context "$KCTX" -n know-meet describe secret know-meet-livekit`; `kubectl ... -n know-meet describe pod <pod>` events | Runbook 3.2 to 3.4. Pods start by themselves once the Secret exists. |
| Token service in `CrashLoopBackOff`, log `configuration_error` naming a variable | A key missing or empty in the Secret, or a non-secret setting missing in the manifest | `kubectl ... -n know-meet logs deploy/know-meet-token-service --previous` (names the variable, never a value) | Recreate the Secret with all three keys (runbook 3.3); fix the manifest by pull request for `KM_*` settings. |
| Pods in `ImagePullBackOff`, event shows `401`, `403` or `denied` | GHCR package still private | Runbook 2.4 check; pod events | Make the package public (runbook 2.4). |
| Pods in `ImagePullBackOff`, event shows `not found` or a placeholder tag | Tag-pin pull request not merged, or the SHA has no images | `kubectl kustomize infra/k8s/overlays/production \| grep image:` on `main` | Merge the tag-pin pull request with the SHA from the images run (runbook 2.3, 2.6). |
| Page loads but the meeting never connects; browser console reports a CSP violation for the `wss://` origin | Placeholder CSP still in the header file, or the header was generated with a different `KM_LIVEKIT_URL` than the image | The header file check in `infra/README.md`; response headers with `curl -sI https://meet.know-me.tools/` | Regenerate the header file from the artifact built with the same URL; pull request; merge. |
| Argo CD shows `ComparisonError` or "repository not found / authentication required" | Repository private and not connected, or the token expired | `argocd repo list`; `argocd app get know-meet` (optional CLI, above) | Runbook 4.1 branch B; 7.4 for an expired token. |
| Certificate stays `READY False` | DNS-01 challenge failing (Cloudflare token scope or rotation), or rate limit on `letsencrypt-prod` | `kubectl ... -n envoy-gateway-system describe certificate <name>`; `get certificaterequest,order,challenge`; `describe challenge <name>` | Fix the cause the Challenge reports. Do not delete and recreate in a loop: production has rate limits; test on staging. |
| No DNS record after 10 minutes | Gateway has no address yet, HTTPRoute not attached to the Gateway, or external-dns failed | Section 5.1: Gateway address, `kubectl ... -n know-meet describe httproute`, external-dns logs | Fix the cause, or create the record by hand (section 5.3). |
| A DNS record for another hostname appears | A manifest names another host | external-dns logs | Stop condition. Stop the run, remove that record by hand, fix the manifest. |
| Browser warns the certificate is untrusted | Still on staging | Section 6.1 `openssl` check | Section 6.2. |

---

## Not confirmed against documentation

These are written as best understood and are marked at the step:

- Reading `kubectl create secret generic --from-file=<key>=/dev/fd/N`
  (process substitution) and `--from-env-file=/dev/stdin`. The documented
  form is `--from-file=<key>=<path>`; the recorded cluster pattern uses
  `/dev/stdin`.
- `argocd login` prompting for the password when `--password` is absent.
- `gh api /orgs/Know-Me-Tools/packages/container/<name>` returning
  `visibility`.
- The exact Secret annotation key `cert-manager.io/issuer-name`.
- A spending alert in the LiveKit Cloud dashboard.
- The external-dns Deployment name `external-dns` and its TXT record naming.
- Whether the Application in `infra/argocd/know-meet.yaml` has automated
  sync and the Argo CD resources finalizer. Read the file before teardown.
