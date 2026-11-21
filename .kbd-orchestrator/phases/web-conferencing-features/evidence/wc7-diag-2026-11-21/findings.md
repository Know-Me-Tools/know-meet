# WC-7 hosted failure — diagnosis (2026-11-21)

## Observed (hosted run, evidence/boundary-2026-11-21-hosted/hosted--wc-7-local-history)
After A leaves and the history page reloads ~1.3 s later, A's history lacks B's message and shows
"Duration Unknown". A saw B's message live; no "meeting history stopped" diagnostic was logged.

## Reproduction (packaged stack, r9 images = merged product code 8f6297ef)
- WC-7 suite test: 2/2 PASS twice (packaged-1, packaged-2). The local stack is fast enough.
- measure/result.json (wc7-measure.ts): A leaves, then A's page loads a new document after a wait.

| CPU throttle | wait after Leave | B's message stored | End time (duration) stored |
| --- | --- | --- | --- |
| 1x | 0 s | yes | NO ("Unknown") |
| 6x | 0 s | yes | NO ("Unknown") |
| 6x | 5 s | yes | yes ("under 1 min") |

## Cause
1. Leave does not wait for history: room-view.tsx calls `void useCases.leave()`, and the
   "meeting ended" view appears on disconnect while the history write queue
   (record-meeting-history.ts, one write at a time) is still running. A page load in that
   window (reload, close, typing a URL) drops the queued writes.
2. `createMeeting`/`updateMeeting` run as single statements, outside `adaptPglite`'s
   transaction wrapper, so they are not followed by `syncToFs()` (the PGlite 0.5.16 flush gap
   found on 2026-11-20). The end time is the last write of a session, so nothing flushes it.
On the live site writes are slower, so B's message (received 4 ms before Leave) was also
still queued when the page reloaded.

## Proposed repair 11 (product code only)
- Flush every history write, not only transactions (one place: the repository's write path).
- Leave waits for history to finish before the meeting-ended view offers navigation
  (room-view awaits `useCases.leave()`; the ended view shows once it settles).
