# Contract amendment 3 (DRAFT). Operator instructions of 2026-11-16, recorded in decision-log.md:
#   "Use other ports", "continue, and add the CD job in this release", "Yes, fix and re-run".
# Apply only after the operator approves, with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-3.jq adopted-contract.json
# Scope, exclusions, required safety checks and the release claim are unchanged.

def ports: "-f .kbd-orchestrator/phases/web-release/evidence/boundary-2026-11-16/compose.ports-override.yaml";

# One correction round beyond the original three repairs ("Yes, fix and re-run") and repairs 5 and 6 ("Yes, repair 5", "Yes, repair 6").
.budgets.repairAttempts = 6

| .boundaryPacket.commands |= map(
    if startswith("docker compose -f tooling/release/compose.yaml up") then
      "docker compose -f tooling/release/compose.yaml " + ports + " up -d --wait"
    elif startswith("docker compose -f tooling/release/compose.yaml down") then
      "docker compose -f tooling/release/compose.yaml " + ports + " down"
    else . end)

| .boundaryPacket.commands |= (
    . as $c | ($c | index("node tooling/release/src/verify-cluster.ts --context gke_knowme-corporate_us-south1_main --json \"$KM_EVIDENCE_DIR/verify-cluster.json\"")) as $i
    | $c[:$i] + [".kbd-orchestrator/phases/web-release/evidence/boundary-2026-11-16/check-livekit-url.sh local",
                 ".kbd-orchestrator/phases/web-release/evidence/boundary-2026-11-16/check-livekit-url.sh cluster"] + $c[$i:])

| .boundaryPacket.commands |= (
    . as $c | ($c | index("pnpm --filter @know-meet/release-tests exec playwright test --project=hosted")) as $i
    | $c[:$i] + [".kbd-orchestrator/phases/web-release/evidence/boundary-2026-11-16/check-livekit-url.sh served"] + $c[$i:])

# Reduced hosted run within production limits (operator: "Reduced hosted run").
| .boundaryPacket.commands |= map(
    if endswith("--project=hosted") then
      . + " --grep \"@WR-1|@WR-2|@WR-3|@WR-5\" --grep-invert \"@negative-control\""
    else . end)

| .boundaryPacket.operatorSteps |= map(
    if startswith("Task 8.6:") then
      "Task 8.6 (continuous deployment): after the operator merges the release pull request, the deploy job of .github/workflows/images.yml pins both newTag lines to the merge commit SHA and pushes one bot commit to main; Argo CD syncs main. The operator merges no tag-pin pull request. The cluster commands run from main at the bot commit."
    else . end)

| .boundaryPacket.expectedEffects += [
    "Continuous deployment: every later push to main that changes application code builds both images and the deploy job pins them on main, so Argo CD updates https://meet.know-me.tools without a manual step. The deploy job changes only the two newTag lines, never moves the pinned commit backwards, and its commit starts no workflow",
    "check-livekit-url.sh confirms the repository variable, the build CSP, the committed Gateway header, the cluster Secret and the served page all name the LiveKit URL from the operator's shell; values are compared, never printed",
    "The local compose stack publishes host ports 18080 (proxy) and 18081 (static web image) instead of 8080 and 8081, which other services hold on the boundary machine; images and container settings are unchanged",
    "The hosted run is reduced to WR-1, WR-2, WR-3 and WR-5 so it stays within production's meeting limits (3 per 10 minutes, 5 live codes per address); WR-4 is proven at the boundary by the packaged run (meeting limits relaxed through the environment only) and by services/livekit/tests/abuse_controls.rs. Production keeps its limits throughout"
  ]

| .boundaryPacket.requiredApprovals |= sub("the tag-pin pull request \\(task 8.6\\)"; "the deploy job's tag pin on main (task 8.6, continuous deployment)")

| .evidenceInvalidation += " Amendment 3: the deploy job's bot commit is the tag pin; the same rule applies to it (only the two newTag lines may differ from the tested commit)."

| .adoptionSource += " Amendment 3: operator answer \"" + $answer + "\" on " + $date
    + " to amendment-3-proposal.md: continuous deployment from main by the images workflow's deploy job in place of the operator-merged tag-pin pull request (decision web-release-promotion-by-pr superseded); one correction round beyond three repairs; the LiveKit URL consistency check; a reduced hosted run within production limits; host ports 18080 and 18081 for the local stack. Scope, exclusions, safety checks and the release claim are unchanged."
