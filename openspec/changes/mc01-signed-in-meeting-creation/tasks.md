## 0. Decisions (operator, before Spec is adopted)

- [ ] 0.1 D1: guest start in the interim (keep under caps / remove / site-wide budget)
- [ ] 0.2 D2: identity provider, pinned in versions.toml
- [ ] 0.3 D3: short codes with a waiting room, or link only
- [ ] 0.4 D4: per-account quotas

## 1. Identity

- [ ] 1.1 Integrate the chosen provider: sign-in (magic link per the prototype) and server-side session verification in the token service
- [ ] 1.2 Sign-in screens on web and Flutter, from the existing prototype screens

## 2. Meeting creation

- [ ] 2.1 Account-keyed start endpoint that creates the room in LiveKit (`livekit-api` `services` feature, pinned)
- [ ] 2.2 Per-account limits with Retry-After
- [ ] 2.3 Signed invite links; key in the cluster Secret, rotation documented

## 3. Joining

- [ ] 3.1 Token issuance checks "room exists and invite valid"; remove the in-memory code store
- [ ] 3.2 Waiting room with host admit and refuse (if D3 keeps short codes)

## 4. Interim guest path

- [ ] 4.1 Apply D1 to the anonymous start endpoint; record its removal as a task of the peer-to-peer change

## 5. Boundary

- [ ] 5.1 Security review of the identity and invite trust boundaries
- [ ] 5.2 Release scenarios for signed-in start, invitee join, tampered link, short code, restart
