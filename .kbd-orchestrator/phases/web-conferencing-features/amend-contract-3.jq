# Contract amendment 3 for web-conferencing-features.
# Apply with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-3.jq adopted-contract.json
# Purpose: one more batched repair (repair 8) for the WC-13 failures found by the closing
# reviews on candidate 11ecd347 (evidence/wc13-2026-11-20/triage.md): the room shell is not
# pinned to the viewport (chat messages and device settings hidden at 768 and wider; the
# control bar leaves the view during a share), plus accessibility defects on the new
# surfaces (focusable content behind open dialogs, label-in-name mismatches, a low-contrast
# selected toggle, a nameless focus stop and a focus stop with no visible change).
# Changes: budgets.extensions, adoptionSource. Unchanged: scope, scenario texts,
# exclusions, required safety checks, gate rule, release claim. The shared kit's secondary
# button fill (finding A) is an incumbent design-system choice and is not in this repair.

.budgets.extensions += [{
    id: "ext-3-wc13-repair",
    repairAttempts: 1,
    timeMinutes: 600,
    toolCalls: 0,
    resultingCeilings: { timeMinutes: 3300, toolCalls: 2500, repairAttempts: 8, noProgressLimit: 3 },
    reason: "Run r7 passed every gate scenario except WC-13, which first ran at the closing reviews: axe 4 of 5 tests failed and the UI review returned BLOCK. The r7 WC-5 screenshot independently shows the room shell defect, so the r7 chat and device scenarios passed on presence, not visibility. Repair 8 is one batched commit for the room layout and the new-surface accessibility defects; the affected scenarios (every in-room scenario, because the room shell changes, plus WC-13) rerun once. Wall-clock since dispatch (2026-11-18T23:51:55Z) was about 2618 minutes at 2026-11-20T19:30Z against 2700.",
    operatorAnswer: $answer,
    date: $date
  }]

| .adoptionSource += " Amendment 3: operator answer \"" + $answer + "\" on " + $date
    + ": one more batched repair (repair 8) for the WC-13 room-layout and new-surface accessibility failures; repairAttempts 7 to 8 and timeMinutes 2700 to 3300. Scope, scenario texts and gate rule unchanged."
