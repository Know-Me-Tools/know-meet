## Context

The token service (wr03, `services/livekit`) creates room codes for anyone, keeps them in a
`HashMap` in one process, and limits abuse by client IP. That design was right for a
guest-only first release with no identity system. Its limits are now tuned against each
other in every review round (see the proposal). The product direction is that LiveKit
rooms belong to signed-in users and the free tier moves to peer-to-peer WebRTC later.

## Goals

- Starting a LiveKit meeting needs a signed-in host. Abuse limits are per account.
- Invitees join without an account, and guessing a code admits no one.
- Room state survives a restart and allows more than one replica.
- The LiveKit API secret stays server-side; clients receive only short-lived tokens.

## Non-goals

- The peer-to-peer free tier, its signaling and TURN.
- Accounts beyond what starting a meeting needs: no profiles, plans or billing.

## Decisions

### Identity provider (D2: operator)

The service needs one thing from identity: a verified account ID on the create request.
Whatever D2 picks, the token service validates a session or token server-side on each
create request, then keys quotas on the account ID. Candidates to evaluate in Analyze:
Ory Network (hosted), Ory Kratos (self-hosted on the same cluster), or a KnowMe identity
service if one exists. The client never sends an account ID it chose.

### The LiveKit room is the record

At start, the service calls `RoomClient::create_room(name, CreateRoomOptions { .. })`.
This is in `livekit-api` 0.10.2 behind the `services` feature, which adds `reqwest`; the
repository uses only `access-token` today, so that feature must be pinned. The call sets
`empty_timeout`, `departure_timeout` and `max_participants`. The room `metadata` holds the
host account ID and the invite expiry. A join is valid while the room exists in LiveKit
and the invite has not expired. LiveKit's empty timeout deletes abandoned rooms, so no
table needs purging and nothing is lost on restart.

Rejected: a shared store (Redis) for codes. It solves restarts and replicas but keeps a
second copy of state that LiveKit already holds.

### Invites (D3: operator)

- **Link:** `https://meet.know-me.tools/j/<token>`, where the token encodes the room name
  and an expiry and carries an HMAC-SHA256 tag under a server key (at least 128 bits of
  entropy in total). Verifying it needs no store. Rotating the key revokes every
  outstanding invite.
- **Short code (recommended to keep):** the host can read out a code. A code only puts
  the joiner in the room's waiting room, and the host admits or refuses each person. A
  correct guess therefore reaches the host's admit prompt, not the meeting. Waiting-room
  screens already exist in the prototype (`docs/design/prototype/`).

### Limits

| Control | Keyed on | Purpose |
|---|---|---|
| Live meetings per account, meetings per day (D4) | account ID | main control on cost and exhaustion |
| Token requests per invite | invite | bounds one leaked link |
| Request rate on join/token | client IP | backstop only; generous enough for offices |
| Guest start (D1, interim) | client IP plus a site-wide daily budget | removed when peer-to-peer ships |

The per-address code caps from PR 11 apply only to the interim guest path.

## Threat model, before and after

| Threat | Today | After |
|---|---|---|
| Fill the code store | about 2,000 addresses at current caps | no store; LiveKit rooms limited per account |
| Office behind one NAT | 50 used codes | per-account limits; IP limit is a backstop |
| Guess a live code | about 48% per address per day with 100,000 live | link: infeasible; code: reaches the waiting room only |
| Spend LiveKit minutes anonymously | any address | signed-in hosts only (plus the D1 interim) |
| Restart drops meetings | yes, every code | no |

## Migration

1. Add sign-in and the account-keyed create path beside the current endpoint.
2. Switch the start screen to sign-in when D1 says so; keep the guest endpoint behind its
   caps and budget until peer-to-peer ships.
3. Move token issuance to "room exists in LiveKit and invite valid", then delete the
   in-memory store.

Old codes are only valid while their process lives, so nothing needs migrating.

## Risks

- **Friction.** PRODUCT.md promises guests can start a meeting. Requiring sign-in changes
  that promise for LiveKit rooms; the interim guest path (D1) keeps it until peer-to-peer
  exists.
- **New dependency on the identity provider.** If it is down, no one can start a meeting.
  Joins keep working because invites are verified locally.
- **The LiveKit API becomes part of every start.** A LiveKit outage blocks starting, which
  it already blocks in practice.

## The uncomfortable part

Moving the free tier to peer-to-peer does not remove the abuse problem; it moves it.
Peer-to-peer still needs a signaling server and, for many networks, a TURN relay, and TURN
relays billed bandwidth. Anonymous TURN credentials would reproduce the same three-way
trade on a new resource. Whatever identity the free tier uses, even an anonymous but
rate-limited device credential, should be designed with this change, not after it.
