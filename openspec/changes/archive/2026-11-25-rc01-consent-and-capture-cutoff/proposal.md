# Consent and capture cutoff

## Why

Late joiners can appear in a saved recording while they are still deciding.
A queued start or slow save can also keep capture running after a person ends it.

## What Changes

- Require affirmative consent for each late admission before its identity or media can enter the recording. A valid decline ends capture for everyone.
- Make capture cutoff independent of encoder and storage completion, including while acquiring the recording microphone.
- Let recorder Leave disconnect and rejoin while the old recording saves. Keep the meeting microphone usable after Stop when the recorder stays.

## Capabilities

### Modified Capabilities

- `local-recording` covers affirmative late-joiner consent, accepted cutoff, and room presence during saving.

## Impact

Scope covers the web recording consent state, application ports, room composition,
browser recorder inputs, and recording indicators. Reuse the existing LiveKit
transport and browser recorder. Follow with `rc02-recording-outcomes` in the same
value phase and use its single packaged boundary.
