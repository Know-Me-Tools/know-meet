# Contract amendment 5 for web-conferencing-features.
# Apply with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-5.jq adopted-contract.json
# Purpose: one test-only repair (repair 10) for the two failures in run r9 at 8f6297ef
# (evidence/boundary-2026-11-21-r9/triage.md). Both are defects in the repair 9 test
# edits, not in the product:
#   1. WC-4 software path asserted the text "not available on this device"; the product
#      copy says "aren't available on this device". The mute check after it never ran.
#   2. The WC-13 keyboard tour still arrows through the effect radios, which are absent
#      when graphics are software (the unavailable note shows instead).
# Repair 10 changes test code only; no product code. Rerun: the WC-4 software-path test
# and the WC-13 keyboard test, once, on the packaged stack built from 8f6297ef product code.
# Changes: budgets.extensions; adoptionSource.
# Unchanged: scope, every scenario (WC-4 oracle already reads "states that background
# effects are not available on this device"), exclusions, required safety checks, gate
# rule, release claim.

.budgets.extensions += [{
    id: "ext-5-test-only-repair",
    repairAttempts: 1,
    timeMinutes: 300,
    toolCalls: 0,
    resultingCeilings: { timeMinutes: 4200, toolCalls: 2500, repairAttempts: 10, noProgressLimit: 3 },
    reason: "Run r9 at 8f6297ef fixed the WC-4 freeze (GPU path: longest main-thread gap after a choice 51 ms, r8 froze for 19 s) and passed the WC-13 surface audits. Two tests failed on mistakes in the repair 9 test edits: the WC-4 software test's expected wording and the WC-13 keyboard tour's effect-radio step. Repair 10 changes only those two tests; they rerun once. Wall-clock since dispatch (2026-11-18T23:51:55Z) was about 3440 minutes at 2026-11-21T09:12Z against 3900. If either test fails again, the phase closes unmet.",
    operatorAnswer: $answer,
    date: $date
  }]

| .adoptionSource += " Amendment 5: operator answer \"" + $answer + "\" on " + $date
    + ": one test-only repair (repair 10) for the WC-4 software-path wording and the WC-13 keyboard tour; those two tests rerun once; repairAttempts 9 to 10 and timeMinutes 3900 to 4200."
