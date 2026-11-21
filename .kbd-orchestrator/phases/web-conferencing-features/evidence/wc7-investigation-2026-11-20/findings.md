# WC-7 investigation (2026-11-20)

Operator approved ("Investigate first") a diagnostic run against the running packaged stack
(candidate 9ad4730b images, compose on 18080) before repair 7. No product code changed.
This is not a boundary run and decides no scenario.

## Method

A throwaway Playwright spec (`wc7-diag-spec.ts.txt`) replays the WC-7 steps with the gate's
helpers. An init script in A's page wraps `BroadcastChannel` and logs every message between
the tab and the PGlite leader worker: each SQL statement, each lock, each `syncToFs`.
Logs have URLs redacted.

- Run 1 (`run1-with-pauses.log`): 3–5 s pauses after each message and after leaving; no reload.
- Run 2 (`run2-gate-timing-reload.log`): the gate's timing (no pauses), then a reload on /history.

## Result

- Run 1: both messages and the meeting's end are stored. With time to settle, every write lands.
- Run 2: after the reload the detail shows "Duration Unknown": the end-of-meeting write was lost.
  This matches the r6 failure screenshot. In r6, B's message was lost as well.

## Cause

1. **PGlite 0.5.16 does not write a transaction to IndexedDB at COMMIT.** In
   `chunk-UYHX356B.js`, `transaction()` runs `BEGIN` before it sets its in-transaction flag,
   so the flush runs after `BEGIN`. It runs `COMMIT` while the flag is still set, so no flush
   follows. The tap log shows `>>> SYNC` after every `BEGIN` and never after `COMMIT`. History
   writes each chat batch inside a transaction (`appendChat`). The newest committed messages
   therefore exist only in the worker's memory until the next history statement flushes them,
   and a reload or a closed tab discards them.
2. **The end-of-meeting write starts late.** `leave()` awaits `inner.leave()` (stopping the
   recording and disconnecting the room) before ending the history session. In run 2 the
   `UPDATE … left_at` ran about 0.8 s after Leave, after the History list had already read the
   database. The reload then landed while it was still in flight.

## User impact

Someone who leaves a meeting and reloads or closes the tab within about a second loses the
meeting's end time, and can lose the last messages. The gate reloads within about a second
of leaving.

## Proposed repair 7 (not applied)

- `history-database.ts` `adaptPglite`: after a transaction resolves, call `db.syncToFs()`, so
  committed history is on disk at commit.
- `with-meeting-history.ts` `leave`: start ending the history session when Leave is pressed,
  alongside `inner.leave()`, rather than after it.
- WC-12 (test only): the simulated autoplay block also pauses unmuted media that starts on its
  own through the `autoplay` attribute before the first trusted click.

## What remains a risk

A reload within roughly 150 ms of pressing Leave can still lose the end time. The browser
gives no way to finish an IndexedDB write once the page is unloading.
