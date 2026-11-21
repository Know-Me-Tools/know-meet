# Contract amendment 1 for web-conferencing-features (DRAFT).
# Apply only after the operator approves, with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-1.jq adopted-contract.json
# Scope, scenarios, exclusions, required safety checks, stop conditions and the
# release claim are unchanged. Changes: budgets.extensions, boundaryPacket.runInputs,
# boundaryPacket.repairPolicy, boundaryPacket.staticGateMode, adoptionSource.

.budgets.extensions = ((.budgets.extensions // []) + [{
  id: "ext-1-batched-repair-and-reserve",
  repairAttempts: 2,
  timeMinutes: 600,
  toolCalls: 0,
  resultingCeilings: {
    timeMinutes: 2100,
    toolCalls: 2500,
    repairAttempts: 5,
    noProgressLimit: 3
  },
  reason: "Repairs 1-3 were each spent on one defect because every boundary run stopped at its first failure. Child phase wc-boundary-defect-scope measured the full static set (D1-D7, children/wc-boundary-defect-scope/assessment.md). Repair 4 is one batched commit for D1-D5; repair 5 is a reserve for behaviour failures in the packaged run, which no static measurement can predict. Wall-clock since dispatch (2026-11-18T23:51:55Z) was 1237 minutes on 2026-11-19T20:29Z against a 1500 ceiling; +600 covers one full run including reviews, publish and the hosted run.",
  operatorAnswer: $answer,
  date: $date
}])

| .boundaryPacket.repairPolicy = "A repair is one commit that fixes every defect known at the time of the repair, after a static sweep (staticGateMode) has listed them all. A repair that fixes only part of a known list is not allowed."

| .boundaryPacket.staticGateMode = "Static steps (install, lint, typecheck, test, build, build:hosted, header render --check) run to completion and record every failure, using Turbo --continue where the script is a Turbo run. The run stops after the static steps if any failed, before images, compose or any network or cluster effect."

| .boundaryPacket.runInputs += [
    "KM_LIVEKIT_URL: set from LIVEKIT_URL in the same shell for build:hosted (tooling/release/README.md); public, never printed; build logs are redacted of it before they are kept as evidence",
    "Host ports: compose proxy and static-web ports are parameterised (KM_PROXY_PORT, KM_STATIC_PORT); 8080 and 8081 are held on the operator machine. KM_SITE_ORIGIN, KM_RELEASE_BASE_URL and KM_RELEASE_STATIC_URL move with them",
    "KM_RELEASE_DEFAULT_BUILD_URL: a vite preview of the default (non-hosted) build, started by the lead for the WC-10 and WC-11 packaged-only tests and stopped at cleanup",
    "KM_RELEASE_PREVIOUS_CSP_FILE: the committed gateway header value before task 6.4 regenerates it",
    "RUSTC_WRAPPER unset for pnpm build: the shared sccache hung cargo build -p bff for 81 minutes on 2026-11-19"
  ]

| .adoptionSource += " Amendment 1: operator answer \"" + $answer + "\" on " + $date
    + ": repairAttempts 3 to 5 (one batched repair plus one reserve), timeMinutes 1500 to 2100, a batched repair policy, run-to-completion static gates, and five run inputs measured by child phase wc-boundary-defect-scope. No scope change."
