# Know Meet

[![Live on IPNS](https://img.shields.io/badge/live-IPNS-FF6A3D?style=flat-square&logo=ipfs&logoColor=white&labelColor=0B0F14)](https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dmgkudr78a92hn7q69se47kfuka78widws7k9hggom5xwvsra6m/)
[![GitHub Pages](https://img.shields.io/badge/mirror-GitHub%20Pages-00C2DC?style=flat-square&logo=github&logoColor=white&labelColor=0B0F14)](https://know-me-tools.github.io/know-meet/)

**Agentic video meetings: meetings where agents do the follow-through.**

Know Meet is the KnowMe meeting room. It is a LiveKit video meeting where people,
their persistent **dots** and registered **LiveKit agents** meet around one shared
memory. Your dot, the agents you register and the **Concierge** sit in the call with
you and transcribe as you talk. When the meeting closes, everyone gets the
transcript, summary and action items.

- **Live prototype and brand kit (always the latest build):** https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dmgkudr78a92hn7q69se47kfuka78widws7k9hggom5xwvsra6m/
- **Home page, pinned build:** https://ipfs.prometheusags.ai/ipfs/bafybeigaqukvi2iiexaukw3vakyshrmfnp6rnd3ci6323eqmouensdeo6e/
- **Mirror (GitHub Pages):** https://know-me-tools.github.io/know-meet/ (brand kit at `/docs/design/brand-guide.html`)
- **Design system, logo, screens and reasoning:** [`docs/design/`](docs/design/README.md)

> The prototype is simulated. Meetings, agents, recordings, SMS, phone and calendar
> connections use fictional sample data. Nothing is sent or stored outside the
> browser.

## What happens in a meeting

Every room is a LiveKit room, and agents are real participants in it. They hear the
same audio, read the same transcript and work from the same shared knowledge, so
the follow-up work is already done when the meeting ends.

- **Persistent dots.** A dot is your always-on personal agent with its own private
  memory. It joins your calls, recalls what was decided last time and keeps notes
  only you can read. Your colleagues bring their own dots.
- **Registered agents.** You register your own LiveKit agent workers once, then add
  them to any meeting mid-call. Examples: Scribe (notes, decisions, action items),
  Researcher (cited answers from meeting knowledge), Facilitator (agenda and time
  boxes) and Translator (live speech and captions).
- **Private agent panel.** You can ask your dot or an agent a question mid-meeting
  without interrupting anyone. Nobody else sees that thread.
- **Shared meeting knowledge.** Uploaded files and every transcript segment feed one
  knowledge base that all agents in the room can read, including the Concierge.
- **Recording and live transcription.** You can start recording at any time, and
  the room asks for consent first. LiveKit Room Composite egress captures everyone
  in one layout as MP4 or HLS.
- **Delivery at close.** When the host ends the meeting, KnowMe writes the summary
  and action items and sends them to every participant: an email with the
  transcript and summary attached, or an SMS with a link. Each user's delivery
  settings decide which.
- **Session recall.** The combined video goes to S3-compatible storage. KnowMe then
  pins it to IPFS and stores the CID with the transcript. You can use storage that
  KnowMe manages, or bring your own bucket and pinning service.
- **Calendars.** Meetings you schedule go onto the calendar you already use (Google
  Calendar, Microsoft 365 / Outlook, or iCloud / CalDAV) with the join link and
  dial-in attached.
- **Invite anyone.** Invites go out by email, SMS, calendar invite or phone dial-in.
  Invitees join in the browser without an account. Phone callers come in through a
  Telnyx SIP trunk and join audio-only with a PIN.

### The Concierge

The Concierge is the system agent, and it is in every room, including guest rooms.
It greets people as they arrive, explains what is happening, answers questions from
the live transcript, routes questions to the right agent, and tells guests what
signing in would add. It is the only agent guests get.

## Guest or signed in

Anyone can start or join a meeting. Signing in turns on everything that needs to
remember you. Invitees never need an account, whichever column the host is in.

| Capability | Guest | Signed in |
|---|---|---|
| Start or join a meeting | ✓ | ✓ |
| Concierge agent | ✓ | ✓ |
| Live transcription | ✓ (deleted when the meeting ends) | ✓ (saved with the meeting) |
| Phone dial-in for invitees (audio-only, via PIN) | ✓ | ✓ |
| Registered agents | — | ✓ |
| Your dot and private agent panel | — | ✓ |
| Uploads to meeting knowledge | — | ✓ |
| Recording (Room Composite egress, MP4 or HLS) | — | ✓ |
| Transcript, summary and action items sent at close (email and SMS) | — | ✓ |
| Recordings library (S3-compatible storage, pinned to IPFS) | — | ✓ |
| Scheduling and calendar connections | — | ✓ |
| Settings and delivery preferences | — | ✓ |

## How a meeting flows

1. **Schedule and invite.** Pick a time, add people by email or phone, and choose
   which agents join. Invites go out by email, SMS and calendar.
2. **Meet with agents.** Your dot and the Concierge are already in the room. Add
   Scribe, Researcher or other agents whenever you need them.
3. **Record and transcribe.** The transcript builds as you talk. Start a Room
   Composite recording once everyone has agreed.
4. **Summary delivered.** On close, the recording is finalized to S3 and pinned to
   IPFS, and the summary is written and sent to every participant.

## Platform

| Concern | Provider |
|---|---|
| Real-time audio and video, agents | LiveKit (rooms, Agents, Egress Room Composite) |
| SMS and inbound phone dial-in | Telnyx (messaging, SIP trunk) |
| Recording storage | S3-compatible storage, then pinned to IPFS |
| Calendars | Google Calendar, Microsoft 365 / Outlook, iCloud / CalDAV |

## Repository layout

| Path | What it is |
|---|---|
| [`docs/design/`](docs/design/README.md) | Brand guide, templates, mood board, tokens, logos and the full prototype |
| `docs/design/prototype/` | Every product screen; start at `index.html` or `screens.html` |
| `scripts/build-site.sh` | Stages the published site layout into a folder; used by both publish scripts |
| `scripts/publish-ipfs.sh` | Publishes the site to IPFS (pinned) and points the `know-meet` IPNS name at it |
| `scripts/publish-pages.sh` | Rebuilds the GitHub Pages mirror on the `gh-pages` branch |

## Publishing

Both published copies are staged by `scripts/build-site.sh`, so they have the same
layout: the prototype at `/` and the brand kit at `/docs/design/`. Run either
script from anywhere in the repo.

```bash
./scripts/publish-pages.sh
```

```bash
IPFS_RPC_USER=… IPFS_RPC_PASS=… ./scripts/publish-ipfs.sh
```

```bash
DRY_RUN=1 ./scripts/publish-ipfs.sh
```

The IPFS script reads its credentials from the environment only, so never commit
them. Each publish produces a new pinned CID, and the IPNS link always points at
the newest one. `DRY_RUN=1` stages the site and lists the files without uploading
anything.
