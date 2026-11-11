# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

One shared Know Meet design language on every surface: the React 19 web app, the
Tauri desktop app (which runs the same web build) and the Flutter mobile app. Mobile
does not adopt iOS or Android visual conventions; it only respects native gestures,
safe areas and system controls. (Confirmed 2026-11-09.)

## Users

**Open decision: the primary audience is not yet confirmed.** The repository supports
three candidate audiences; future work must not rank them until the owner does:

- people who already use KnowMe and their dots, whose meetings should feed the same
  memory;
- small teams and consultants who want meeting follow-up (summary, action items,
  delivery) done for them;
- developers who register their own LiveKit agents and want to put them in a real
  meeting.

Confirmed secondary audiences: **invitees**, who join in the browser with no account
(or by phone, audio-only, with a PIN), and **guests**, who start or join meetings
without signing in and get only the Concierge.

## Product Purpose

Know Meet is the KnowMe meeting room: "meetings where agents do the follow-through."
It is a LiveKit video meeting where people, their persistent dots and registered
LiveKit agents meet around one shared memory. When the host ends the meeting, every
participant receives the transcript, summary and action items, so the follow-up work
is already done.

## Positioning

**Hypothesis from the repository, not yet confirmed by the owner:** agents are real
participants in the room (they hear the same audio and read the same transcript);
each person's dot carries private memory across meetings; and users can bring their
own registered LiveKit agents and add them mid-call. The brand mark encodes this: one
cyan dot on the ring means "an agent is at the table."

## Operating Context

A meeting runs in four steps: schedule and invite (email, SMS, calendar invite, phone
dial-in); meet with agents (your dot and the Concierge are already in the room; add
Scribe, Researcher, Facilitator, Translator or your own agents as needed); record
and transcribe (Room Composite recording only after in-room consent); summary
delivered at close (email with attachments or SMS with a link, per each user's
delivery settings).

Surfaces: home, start/lobby/room (signed-in and guest), join (invitee, waiting room,
expired link, wrong code), auth (magic link), dashboard (calendar meetings,
scheduling), agents (registry, four-step registration, Concierge, dots), recordings
(library, player, transcript, summary, storage), settings (LiveKit, Telnyx,
calendars, S3/IPFS storage, recording, delivery, templates). Every screen and state
is in `docs/design/prototype/` (`screens.html` lists them).

## Capabilities and Constraints

- **Real-time media and agents:** LiveKit rooms, LiveKit Agents, Egress Room
  Composite (MP4 or HLS).
- **Telnyx:** SMS, and inbound phone dial-in over a SIP trunk (audio-only, PIN).
- **Recording storage:** S3-compatible (managed by KnowMe or the user's own bucket),
  then pinned to IPFS; the CID is stored with the transcript.
- **Calendars:** Google Calendar, Microsoft 365 / Outlook, iCloud / CalDAV.
- **Shared meeting knowledge:** uploaded files and every transcript segment feed one
  knowledge base all agents in the room can read, including the Concierge.
- **Private agent panel:** a thread with your dot or an agent that only you see.
- **The Concierge:** the system agent, present in every room including guest rooms;
  the only agent guests get.
- **Guest vs signed in:** guests get start/join, the Concierge, phone dial-in for
  invitees and a live transcript deleted when the meeting ends. Registered agents,
  dots, the private panel, uploads, recording, delivery at close, the recordings
  library, scheduling, calendars and settings require sign-in. Invitees never need
  an account.
- **Security:** LiveKit and Telnyx secrets stay server-side; clients only receive
  minted tokens.
- **Terminology:** dot, Concierge, registered agent, private agent panel, shared
  meeting knowledge, delivery at close, session recall.

## Brand Commitments

- Name "Know Meet" (two words); part of the KnowMe family. Final logo is the
  **Gathering** mark (`docs/design/logos/gathering-*`, `know-meet-*`); Bridge and Grid
  concepts are superseded.
- The binding brand system is `docs/design/` (brand guide, tokens, mood board,
  prototype). The existing look and feel is to be replicated, not redesigned, unless
  the owner authorizes a redesign.
- Voice: plain, calm and explicit about audiences ("only you and Marcus see this").
  Agents have names and jobs and say what they did. Errors give the cause, then the
  fix.

## Evidence on Hand

- Working prototype of every screen (`docs/design/prototype/`) and a live-LiveKit
  variant (`docs/design/live/`), published on IPNS and GitHub Pages.
- Brand guide, templates, mood board, tokens, logo files and an Open Graph image in
  `docs/design/`.
- All meetings, agents, recordings and people in the prototype are fictional sample
  data. There are no real customers, testimonials, usage numbers, pricing or
  licensed photography; future work must not invent them.

## Product Principles

1. **Follow-through over features:** a meeting succeeds when its follow-up is done
   and delivered, not when it has more controls.
2. **Agents are participants, and say so:** every agent is named, has a job, and is
   visibly present when it acts.
3. **Audiences are always explicit:** anything private (dot memory, the private
   panel) says who can see it; nothing private leaks to the room.
4. **Consent before capture:** recording starts only after the room agrees.
5. **No account needed to join:** invitees and guests get a complete meeting without
   signing up.

## Accessibility & Inclusion

Required project-wide (`.kbd-orchestrator/constraints.md`): semantic HTML or
accessible names, visible focus, and reduced-motion support; all motion, including
the dot, stops under reduced motion. Light mode uses the darker text tokens chosen
for contrast (`#C13E1E` ember text, `#0E7490` cyan text). Live captions and
audio-only phone access are part of the product.
