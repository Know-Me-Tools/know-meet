# Reflection — web conferencing hardening

## Plan-to-delivery delta

The original short-recording plan assumed that Stop could never reach a recorder
during startup. Source review overturned that assumption, and amendment 3 withdrew
the change. The archive retains the historical change. HD-7 exercised the existing
consent, save, and playback path in Chromium.

Early background tests observed the pane without establishing that reopening it
triggered preparation. The final oracle toggles the camera, observes status and
processor changes, and exercises a positive control on the same observation.

The first repair 5 launch stopped before any scenario ran. Later runs used the
quiet-machine gates and a detached runner. The complete repair 5 run passed the
product scenarios but failed Biome. Amendment 4 limited repair 6 to the nine
recorded formatting and import-order diagnostics. The final run passed lint and
the full boundary. Both builds produced the same web image digest.

## What the final evidence covers

PR #24 shipped the background preparation and loading feedback, distinct browser
and graphics notes, visible keyboard focus with return after repeated F6, and
verification of the meeting-history Saving status. The packaged and hosted
Chromium results passed. Independent code and UI reviews accepted the final
candidate. The only recorded warning concerns the HD-5 retry path, which can
miss invalid semantics if the status disappears before it is read. The final
run passed on its first attempt.

Live screen-reader speech, unstimulated GPU preparation timing, other browsers,
and native platforms were outside this final verification.

## Lessons

- Bind each run to the signed contract and frozen tree. Verify the deployed
  images against the release pins before attributing a hosted run to that tree.
- Establish a trigger and positive control before relying on a negative UI
  assertion.
- Track required PR CI independently of the packaged product verdict.
- Keep raw Playwright evidence local and scan the publishable staged tree,
  including encoded attachments.

Recording startup, consent, and short-recording behavior remain follow-up work.
