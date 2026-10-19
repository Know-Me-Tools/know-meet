# Know Meet — design

[![Live on IPNS](https://img.shields.io/badge/live-IPNS-FF6A3D?style=flat-square&logo=ipfs&logoColor=white&labelColor=0B0F14)](https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dmgkudr78a92hn7q69se47kfuka78widws7k9hggom5xwvsra6m/)
[![GitHub Pages](https://img.shields.io/badge/mirror-GitHub%20Pages-00C2DC?style=flat-square&logo=github&logoColor=white&labelColor=0B0F14)](https://know-me-tools.github.io/know-meet/)

Know Meet is the KnowMe meeting room: a LiveKit video meeting where people, their
persistent **dots** and registered **LiveKit agents** meet around one shared memory.
This folder holds the brand system, the logo, and a working copy of every product
screen.

Live, always-latest copy (IPNS):
https://ipfs.prometheusags.ai/ipns/k51qzi5uqu5dmgkudr78a92hn7q69se47kfuka78widws7k9hggom5xwvsra6m/

Mirror on GitHub Pages (republish with `scripts/publish-pages.sh` in the know-meet repo):
https://know-me-tools.github.io/know-meet/

## What is here

| Path | What it is |
|---|---|
| `brand-guide.html` | The rules: logo, construction, clear space, minimum size, misuse, colour and contrast, type, motion (dot states), icons, voice, file list |
| `brand-template.html` | Ready layouts: social/Open Graph card, slide cover, email header and summary, document cover, app header, avatar. Each has a "Copy HTML" button |
| `mood-board.html` | The visual direction — "a calm room with live signals" — with character words, colour proportions, room vocabulary, photography brief and anti-references |
| `logo-concepts.html` | The three logo directions that were explored, kept for the record |
| `tokens.css` / `tokens.json` | Design tokens (colour, type, space, radius, motion) for dark and light |
| `brand.css` | Styles shared by the brand documents |
| `logos/know-meet-*` | Final logo files (wordmark outlined, no fonts needed) |
| `logos/{gathering,bridge,grid}-*` | Concept-round files, superseded |
| `og/know-meet-home-1200x630.png` | Screenshot of the home page used as the link-preview image |
| `prototype/` | A copy of every prototype screen with its `assets/` folder; open `prototype/index.html` or `prototype/screens.html` |

## The screens

All screens live in the prototype. `prototype/screens.html` lists every screen and
state with a direct link. The main pages:

| Page | Covers |
|---|---|
| `index.html` | Home: start as a guest, join with a code, features, guest vs signed-in |
| `meet.html` | Start, lobby, signed-in room, guest room (Concierge only), recording consent, live transcript, invites (email, SMS, link, calendar, dial-in), group and private chat with files, end and post-meeting processing |
| `join.html` | Invitee landing (no account), waiting room, expired link, wrong code |
| `auth.html` | Sign in, sign up, check email, magic link, sign-in error |
| `dashboard.html` | Upcoming meetings from calendars, scheduling, meeting detail, invite delivery |
| `agents.html` | Agent registry, 4-step registration wizard, agent detail, Concierge, dots |
| `recordings.html` | Library, recording detail (player, transcript, summary, delivery, storage), processing |
| `settings.html` | LiveKit, Telnyx SMS and dial-in, calendars, storage (S3 and IPFS), recording, delivery, templates |

## Decisions and reasoning

**The mark — Gathering.** An ember core with five participant dots on a ring; one
dot is cyan. The core is the same ember dot that sits at the centre of the KnowMe K,
so Know Meet reads as part of the family without repeating the K. The ring says
"people meet here"; the single cyan dot says "an agent is at the table" — the
product's real difference from other meeting apps. It was chosen over *Bridge*
(more distinctive, but silent about agents) and *Grid* (clearest at 16px, but too
close to existing conferencing icons). The ring also gives the product its motion:
the core becomes the live orb that breathes, thinks and speaks.

**Name and wordmark.** "Know Meet", two words, Space Grotesk Bold with "Meet" in
ember — the same pattern as the KnowMe wordmark. The final files have the text
converted to outlines so they render identically everywhere.

**Colour.** Inherited from KnowMe: ink grounds, filled panels instead of borders,
ember for the one most important thing on a screen, cyan only for agent and dot
activity. Dark is the default theme. Two deliberate light-mode adjustments for
readable text: buttons and small ember text use `#C13E1E` (5.3:1 on white) instead
of brand ember `#E04E28` (4.0:1, graphics only), and cyan text uses `#0E7490`.

**Type.** Space Grotesk for display and the wordmark, Inter for reading, JetBrains
Mono for technical labels — continuing KnowMe rather than inventing a new voice.

**Motion.** Interface motion is fast (150–300ms) and only confirms actions. The
dot is the only thing that moves on its own, because it is the only thing that is
alive: listening (3.2s breath), thinking (0.9s sweep), speaking (1.6s ripple),
paused (static, greyscale). Everything stops under reduced motion.

**Voice.** Plain, calm and explicit about audiences ("only you and Marcus see
this"). Agents have names and jobs and say what they did. Errors give the cause,
then the fix.

**Product scope reflected in the screens.** LiveKit carries all real-time media;
recording is LiveKit Egress Room Composite to S3-compatible storage, then pinned
to IPFS. Telnyx is used only for SMS and inbound phone dial-in. Guests get the
Concierge and an ephemeral transcript; everything else needs sign-in.

## Using the system

- Link `tokens.css` and use the `--km-*` variables; set `data-theme="light"` on
  `<html>` for light mode.
- Use `logos/know-meet-lockup-dark.svg` on dark grounds and `-light` on light;
  the symbol alone below 96px wide; never below 16px.
- Keep clear space equal to the core's diameter (one third of the symbol height).
- Copy layouts from `brand-template.html` rather than rebuilding them.

## Publishing

`publish-ipfs.sh` (project root) uploads the prototype and this folder as one
linked directory and points the `know-meet` IPNS name at it, so the IPNS link above
always serves the latest build.

```sh
export IPFS_RPC_USER=…   # never commit these
export IPFS_RPC_PASS=…
./publish-ipfs.sh
```

## Known limits

- The prototype is simulated: no live LiveKit, Telnyx, calendar, email or storage
  connections. No keys or secrets are stored in any file.
- Fonts load from Google Fonts; offline, text falls back to system fonts (logo
  files are unaffected).
- No licensed photography has been sourced; the mood board describes the brief.
