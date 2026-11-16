# Contract amendment 4 (DRAFT). Budget accounting only, for terminal closure.
# Apply only after the operator approves, with the operator's answer and the date:
#   jq --arg answer "<operator's words>" --arg date "<YYYY-MM-DD>" \
#      -f amend-contract-4.jq adopted-contract.json
# Scope, scenarios, exclusions, required safety checks, boundary commands and the
# release claim are unchanged. Only budgets.extensions and adoptionSource change.

.budgets.extensions = ((.budgets.extensions // []) + [{
  id: "ext-1-repair-7-and-wall-clock",
  repairAttempts: 1,
  timeMinutes: 150,
  toolCalls: 0,
  resultingCeilings: {
    timeMinutes: 1950,
    toolCalls: 2500,
    repairAttempts: 7,
    noProgressLimit: 3
  },
  reason: "Repair 7 (b29d7d59, images.yml negative-control image gets a file layer) was approved in chat (\"Yes, repair 7\") and never signed. Execute ran 1944 wall-clock minutes (dispatch 2026-11-15T12:15Z to execute complete 2026-11-16T20:39Z), above the 1800 ceiling; the extension covers the measured wall-clock value rather than switching to a more favourable active-time measure.",
  operatorAnswer: $answer,
  date: $date
}])

| .adoptionSource += " Amendment 4: operator answer \"" + $answer + "\" on " + $date
    + ": budget extension for terminal closure (repairAttempts 6 to 7 for repair 7; timeMinutes 1800 to 1950 for measured wall-clock 1944). No scope change."
