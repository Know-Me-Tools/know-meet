## Why

Anyone can create a Know Meet room without an account. The token service keeps every live
room code in one fixed-size table in process memory, and the only thing it can tell callers
apart by is their IP address. So every abuse limit trades three things that cannot all be
satisfied:

- **A per-address cap** treats an office, a carrier NAT or a VPN as one person, while an
  attacker gets many addresses cheaply (one IPv6 /48 is 65,536 /64 keys).
- **The total store size**: a small store is filled by a few hundred addresses, which
  blocks everyone; a large one holds more live codes, and a 6-character code (about 2.2
  billion values) gets easier to guess as more are live.
- **Rate limits** only slow both problems down.

The security review cycle shows it: H1 (store exhaustion) led to a per-address cap, which
caused N1 (offices limited to 5 meetings a day), which led to separate unused and used caps
(PR 11). Each fix moves the same dials, and the next review will move them again. LiveKit
SFU minutes are billed, so anonymous creation also spends money.

Product direction (operator, 2026-11-16): the free tier will later be pure peer-to-peer
WebRTC without an SFU. LiveKit rooms become a capability of signed-in users. This change
puts that boundary in place for LiveKit rooms now.

## What Changes

- **Starting a LiveKit meeting requires a signed-in host.** Limits apply per account, not
  per address. Invitees still join without an account (PRODUCT.md rule kept).
- **Invites are unguessable.** The host shares a signed link of at least 128 bits of
  entropy. A typed short code, if kept, only puts the joiner in a waiting room that the host
  controls, so guessing it admits no one.
- **Room state moves out of process memory.** The service creates the room in LiveKit at
  start time and treats the LiveKit room as the record. Restarts no longer drop meetings,
  and more than one replica can run.
- **IP-based limits remain only as a coarse backstop** on the unauthenticated endpoints
  (join and token), not as the main control.
- **Guest start becomes an interim path** (decision D1 below) until the peer-to-peer free
  tier exists in a separate, later change.

## Decisions the operator must make

- **D1, guest start in the interim:** keep it under today's caps until peer-to-peer ships
  (recommended); remove it at once; or keep it behind a small site-wide daily budget.
- **D2, identity provider:** for example Ory Network, self-hosted Ory Kratos, or a KnowMe
  identity service. The prototype's auth screen is a magic link. Nothing is chosen in the
  repository yet; `versions.toml` must pin the choice.
- **D3, short typed codes:** keep them with a host-admitted waiting room (recommended), or
  remove them and join by link only.
- **D4, per-account quotas:** live meetings per account and meetings per day.

## Capabilities

### New Capabilities

- `meeting-creation`: Who may start a LiveKit meeting, how invitees are admitted, and where
  room state lives

### Modified Capabilities

- `token-service` (wr03): room codes are no longer its own in-memory record; the
  anonymous create endpoint becomes the interim guest path or is removed (D1)

## Out of scope

- The peer-to-peer free tier (signaling, TURN and the client media path): a later change.
- Recording, dots, registered agents, billing and plans.

## Impact

- Owner roles: `livekit-platform` (service), `client-shell` and `ui-engineer` (sign-in and
  start/join screens), `security-reviewer` at the boundary.
- New dependency: the identity provider (D2), pinned in `versions.toml` before use.
- Phase: a new phase after `web-release`. Nothing here changes the current release.
