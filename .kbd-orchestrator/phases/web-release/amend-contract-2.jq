# Contract amendment 2 (DRAFT, not adopted). Explained in amendment-2-proposal.md.
# Apply only after the operator approves, with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-2.jq adopted-contract.json
# Scope, exclusions, required safety checks, budgets and the release claim are unchanged.

def ctx: "gke_knowme-corporate_us-south1_main";
def app: "applications.argoproj.io/know-meet";
def kwait: "kubectl --context " + ctx + " -n argocd wait " + app;

.scenarioMatrix |= map(
  if .id == "WR-7" then
    .productionEntry = "kubectl --context " + ctx + " -n argocd get " + app
      + " -o json, compared with the image digests recorded by the build workflow"
  else . end)

| .boundaryPacket.commands = [
    "pnpm install --frozen-lockfile",
    "pnpm run lint",
    "pnpm run typecheck",
    "pnpm run test",
    "cargo check --workspace",
    "pnpm --filter @know-meet/web run build:hosted",
    "node tooling/release/src/render-gateway-headers.ts",
    "git commit --only infra/k8s/overlays/production/security-headers.yaml -m \"chore(release): render gateway security headers\"",
    "node tooling/release/src/render-gateway-headers.ts --check",
    "docker compose -f tooling/release/compose.yaml build",
    "node tooling/release/src/scan-artifacts.ts",
    "docker compose -f tooling/release/compose.yaml up -d --wait",
    "pnpm --filter @know-meet/web run build",
    "pnpm --filter @know-meet/web preview --host 127.0.0.1 --port 4173 --strictPort",
    "pnpm --filter @know-meet/release-tests exec playwright test --project=packaged",
    "docker compose -f tooling/release/compose.yaml down",
    "git fetch origin main",
    "git diff --exit-code \"$KM_TESTED_COMMIT\" origin/main -- . \":(exclude)infra/k8s/overlays/production/kustomization.yaml\"",
    "node tooling/release/src/scan-artifacts.ts",
    "node tooling/release/src/verify-cluster.ts --context " + ctx + " --json \"$KM_EVIDENCE_DIR/verify-cluster.json\"",
    "kubectl --context " + ctx + " apply -f infra/argocd/know-meet.yaml",
    kwait + " --for=jsonpath='{.status.sync.status}'=Synced --timeout=600s",
    kwait + " --for=jsonpath='{.status.health.status}'=Healthy --timeout=600s",
    "node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools --allow-staging --json \"$KM_EVIDENCE_DIR/verify-endpoint-staging.json\"",
    kwait + " --for=jsonpath='{.status.sync.revision}'=\"$KM_ISSUER_COMMIT\" --timeout=600s",
    kwait + " --for=jsonpath='{.status.health.status}'=Healthy --timeout=600s",
    "node tooling/release/src/verify-endpoint.ts --host meet.know-me.tools --csp-file apps/web/dist-hosted-csp.txt --json \"$KM_EVIDENCE_DIR/verify-endpoint.json\"",
    "pnpm --filter @know-meet/release-tests exec playwright test --project=hosted"
  ]

| .boundaryPacket.operatorSteps = [
    "Before the run starts: the work of wr01 to wr08 (tasks 8.1 to 8.5) is committed on the release branch at the operator's request. It is not pushed. The repository variable KM_LIVEKIT_URL is set to the same public URL as LIVEKIT_URL in the operator's shell.",
    "After the packaged run and the reviews, the lead shows every line that names a host in the render of the tested commit (kubectl kustomize infra/k8s/overlays/production, a local render) and the packaged verdicts. The operator gives or withholds the second approval.",
    "After the second approval: the release branch is pushed and its pull request opened; the operator merges it. The images workflow builds and pushes both images tagged with the merge commit SHA.",
    "The operator makes the two GHCR packages public and records a spending control for the LiveKit Cloud project.",
    "Task 8.6: the lead prepares the tag-pin pull request (the two newTag lines only); the operator merges it. The cluster commands run from main at that commit.",
    "Before verify-cluster: the operator runs kubectl --context " + ctx + " create namespace know-meet, then creates Secret know-meet-livekit in it as written in docs/release/web-release-runbook.md section 3.3 and checks it as in 3.4. No value is printed, passed as an argument or written to a file.",
    "Only if the repository is private: the operator creates the Argo CD repository credential as in runbook section 4.1, branch B.",
    "After the staging endpoint check: the lead prepares the one-line issuer pull request (letsencrypt-staging to letsencrypt-prod in infra/platform/certificate.yaml); the operator merges it. Its merge commit is KM_ISSUER_COMMIT.",
    "If the A record for meet.know-me.tools has not resolved 10 minutes after the Gateway has an address, the operator creates it in Cloudflare by hand."
  ]

| .boundaryPacket.expectedEffects = [
    "All commands exit 0",
    "The header generator writes the Content-Security-Policy of this build into security-headers.yaml and the boundary runner commits that one file on the release branch. The commit after it is the tested commit (KM_TESTED_COMMIT). The static gates ran on its parent, which differs by that file only; both SHAs are recorded. On a repeat run that renders an identical file there is nothing to commit; the commit step is then recorded as skipped, not as a failure",
    "docker compose build produces know-meet-web:boundary and know-meet-livekit:boundary from the two Dockerfiles, with KM_LIVEKIT_URL passed to the web image as the compose file defines",
    "scan-artifacts runs without --manifests, so it renders the production overlay itself and scans that render. It runs twice: on the tested commit, and again on main after the tag pin",
    "The packaged run passes WR-1, WR-2, WR-4, WR-5 and WR-8 against the built images before any push, merge or cluster command",
    "The default-build and preview commands run after both images are built and scanned, so the default build cannot enter an image; the preview runs in the background only for the packaged run",
    "The git diff command proves that main after the tag pin equals the tested commit in every file except the production kustomization.yaml, and that file differs only in the two newTag lines. Any other difference stops the run",
    "verify-cluster is read-only and confirms the Envoy Gateway controller is running at v1.10.0 (the version in cluster-context.md) and serves gateway.networking.k8s.io/v1, both ClusterIssuers, external-dns, Argo CD, the namespace know-meet and the operator-created Secret with its three key names. It does not require a GatewayClass: the cluster check of 2026-11-15 found none",
    "The apply creates one Argo CD Application; Argo CD creates the GatewayClass eg (controller gateway.envoyproxy.io/gatewayclass-controller), two Deployments, two Services, the Gateway, the HTTPRoutes and the Certificate, and takes over the namespace know-meet that the operator created",
    "The Application is Synced and Healthy at the tag-pin commit. The waits read the Application object with kubectl; no Argo CD login, port-forward or password is used",
    "external-dns creates the A record for meet.know-me.tools pointing at the Gateway load balancer address",
    "cert-manager issues a staging certificate into Secret meet-know-me-tools-tls. After the staging endpoint check and the issuer merge, cert-manager reissues from production into the same Secret. The boundary runner waits, by read-only get, until the issuer recorded on that Secret is letsencrypt-prod before the production endpoint check",
    "The production endpoint check and the hosted run pass WR-1 to WR-5 at the public URL",
    "WR-7: the running image digests equal the digests the workflow pushed for the pinned tag"
  ]

| .boundaryPacket.requiredApprovals = "Before execution (batch 1, done): pins, an account of the uncommitted changes, and the cluster login for task 1.6. Before the single boundary run starts: operator approval. It covers the commands up to the packaged run, the reviews, and one commit of the generated security-headers.yaml on the release branch. It covers no push, merge or cluster command. After the packaged run and the reviews (batch 2): a second explicit operator approval with the reviewed HTTPRoute hostname shown. It covers, in this order: pushing the release branch and merging its pull request; the images workflow; making the GHCR packages public; a recorded LiveKit spending control; the tag-pin pull request (task 8.6); creating the namespace know-meet and the LIVEKIT Secret from the shell; the Argo CD repository credential only if the repository is private; the apply of the Application; and the one-line issuer pull request. The operator performs every merge, the namespace and Secret creation and any account setting. The second approval covers no hostname other than meet.know-me.tools."

| .boundaryPacket.cleanup = [
    "Stop and remove the local compose stack",
    "Remove scratch images and negative-control builds",
    "Do not delete Secret meet-know-me-tools-tls: staging and production share it and production issuance overwrites it in place. Record the issuer on the Secret and the issuer the endpoint serves",
    "Keep evidence folders",
    "Stop the default-build preview server before any push, merge or cluster command",
    "Treat Playwright traces as sensitive because they hold short-lived tokens; do not publish raw traces"
  ]

| .boundaryPacket.stopConditions += [
    "The repository variable KM_LIVEKIT_URL differs from LIVEKIT_URL in the shell that builds the packaged images",
    "main moved, or the merge changed the tree: the git diff between the tested commit and main shows any difference outside the two newTag lines",
    "The pull-request checks or the images workflow fail; a repair is a new commit and consumes a repair attempt, and the packaged run is repeated on the new tested commit",
    "The issuer pull request changes anything other than spec.issuerRef.name in infra/platform/certificate.yaml"
  ]

| .boundaryPacket.runInputs += [
    "KM_LIVEKIT_URL: the public wss URL for build:hosted, set from LIVEKIT_URL in the shell and equal to the repository variable of the same name. It is public and is not a secret.",
    "LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in the shell that starts the compose stack. Compose passes them to the token service by name. They are never printed, passed as arguments or written to a file, and they are not inputs of the tests.",
    "KM_TESTED_COMMIT: the commit of the release branch after the header commit. KM_ISSUER_COMMIT: the merge commit of the issuer pull request on main. Both are recorded in the evidence folder."
  ]

| .evidenceInvalidation += " Amendment 2: the tested tree is identified by KM_TESTED_COMMIT. Evidence from the packaged run stays valid for the deployed commits while their only differences from the tested commit are the two newTag lines of the production kustomization.yaml and the one issuerRef.name line of infra/platform/certificate.yaml. Any other difference invalidates it. The packaged run tests locally built images; the cluster runs the images the workflow built from the same tree, and their digests differ. Only the hosted run and WR-7 are evidence about the deployed images."

| .adoptionSource += " Amendment 2: operator answer \"" + $answer + "\" on " + $date
    + " to amendment-2-proposal.md: working compose path; header render and commit inside the run; packaged run before any push or merge, with task 8.6 after the second approval; namespace created by the operator before the Secret; Application waits by kubectl instead of the Argo CD CLI; staging and production endpoint checks around the issuer merge; no deletion of the shared TLS Secret; evidence rule for the tag-pin and issuer commits. Scope, exclusions, safety checks, budgets and the release claim are unchanged."
