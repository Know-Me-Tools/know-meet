# Contract amendment 6 for web-conferencing-features.
# Apply with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-6.jq adopted-contract.json
# Purpose: one product repair (repair 11) for the WC-7 failure in the hosted run of the merged
# build 59543ab1 (evidence/boundary-2026-11-21-hosted/hosted--wc-7-local-history). After Leave
# and a reload, A's history lacked B's message and the meeting's end time. Diagnosis
# (evidence/wc7-diag-2026-11-21/findings.md): Leave does not wait for the history write queue,
# so a page load right after Leave drops queued writes; and single-statement history writes
# (createMeeting, updateMeeting) are not flushed to IndexedDB (PGlite 0.5.16 flush gap).
# Repair 11: flush every history write before it resolves, and make Leave wait for history to
# finish before the meeting-ended view offers navigation. Product code only.
# Rerun: WC-7 on the packaged stack in Chromium, Firefox and WebKit, WC-2 and WC-3 as a chat
# regression; after merge and deploy, hosted WC-7 in the three engines and the hosted
# Firefox cells for WC-2 and WC-3 (Firefox was missing from this machine until 2026-11-21).
# Changes: budgets.extensions; adoptionSource.
# Unchanged: scope, every scenario, exclusions, required safety checks, gate rule, release claim.

.budgets.extensions += [{
    id: "ext-6-wc7-history-repair",
    repairAttempts: 1,
    timeMinutes: 300,
    toolCalls: 0,
    resultingCeilings: { timeMinutes: 4500, toolCalls: 2500, repairAttempts: 11, noProgressLimit: 3 },
    reason: "The hosted run of merged build 59543ab1 passed WC-1, 2, 3, 4, 5, 8 and 12 in Chromium and WC-2 in WebKit, and failed WC-7: B's message and the meeting end were missing from A's history after a reload. Reproduced on the packaged stack (the end time is lost on any page load right after Leave); cause is the unawaited Leave plus unflushed single-statement writes. Repair 11 is one product commit for both. Wall-clock since dispatch (2026-11-18T23:51:55Z) was about 3800 minutes at 2026-11-21T15:10Z against 4200. If WC-7 fails again after repair 11, the phase closes unmet.",
    operatorAnswer: $answer,
    date: $date
  }]

| .adoptionSource += " Amendment 6: operator answer \"" + $answer + "\" on " + $date
    + ": one product repair (repair 11) for the WC-7 history writes lost after Leave; WC-7 reruns packaged and hosted in Chromium, Firefox and WebKit with WC-2 and WC-3 as regression; repairAttempts 10 to 11 and timeMinutes 4200 to 4500."
