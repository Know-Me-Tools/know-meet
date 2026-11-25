# Recording outcomes

## Why

A header or nonempty file can appear to be a successful recording. During slow
finalization a Stop can also obscure an encoder or storage failure.

## What Changes

- Make empty and unusable results visible as failures. Keep playable partials
  labeled Incomplete and honor existing quota retention.
- Show a known unavailable condition before capture and surface runtime start
  failure promptly.
- Verify the whole phase once through packaged Chromium with independent decoded
  media markers and the existing WC-8 and WC-9 regressions.

## Capabilities

### Modified Capabilities

- `local-recording` covers visible terminal outcomes and supported local playback.

## Impact

Scope covers the encoder and writer outcome path, local recording index and
library, room notice, and packaged release fixtures. Depends on
`rc01-consent-and-capture-cutoff`. Silent-room playback fixes, displayed-duration
correction, and Firefox and real Safari support claims are deferred.

Phase exclusions also cover native desktop and mobile, server-side recording,
recording uploads, rewriting old recordings, new runtime dependencies and a
general consent revocation control.
