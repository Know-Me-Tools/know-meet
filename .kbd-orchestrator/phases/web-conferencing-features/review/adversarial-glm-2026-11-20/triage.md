# Triage of glm-5.3 findings (producer side, 2026-11-20)

## CRITICAL p4: "standalone writes bypass syncToFs". Refuted by the library source.
PGlite 0.5.16 `chunk-UYHX356B.js`: the standalone `query` path (R) and the `exec` path (m) both end with
`f(this,p)||await this.syncToFs()`. That is, they flush to IndexedDB whenever the call is NOT inside a
transaction (p is the in-transaction flag). Only `transaction()` misses the flush, because COMMIT runs while
p is still set. Repair 7 added that one missing flush (history-database.ts:46-48). Standalone createMeeting,
updateMeeting, deleteMeeting and deleteAll writes are flushed by PGlite itself.
Behavioural corroboration: the WC-7 r7 run passed (meeting, end time and both messages survive a reload; delete survives a reload).
The judge did not see the library source, which is why it raised this.

## WARNING / SUGGESTION
Not triaged one by one. Recorded as follow-up candidates. None maps to a failed gate scenario in r7.
