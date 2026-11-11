# Know Meet Live

This is the Know Meet prototype with a **real LiveKit meeting room**. It uses the same
brand, pages and design system as `docs/design/prototype/`, but starting or joining a
meeting connects you to a real LiveKit room using your own LiveKit project.

## Run it

```bash
./docs/design/live/start.sh
```

Then open **http://localhost:5173**.

`start.sh` loads `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` from your
environment. If they're missing, it sources them from `~/.bash_profile`. It stops with a
clear message if any of them is still missing. You need Node 18 or newer. There's nothing
to install.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `5173` | Port for the local server |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` to accept connections from your network |

## Try it with two people

1. Open http://localhost:5173, choose **Start a meeting**, give it a name and continue.
2. In the lobby, turn the camera on, check the mic meter, then select **Join now**.
3. Copy the join link from the lobby or the People panel. Open it in a second browser
   window, or a different browser, and join with another name.
4. You should see and hear each other. Try screen sharing, chat, mute, and the
   active-speaker ring.
5. As the host, select **Leave → End for everyone**. Both windows go to the
   after-meeting screen.

You can also type a code such as `km-4fq-82x` into **Join with a code** on the home
page. Every well-formed code is the name of a LiveKit room.

## What's real and what's simulated

| | Status |
|---|---|
| Room connection, reconnecting, live/connection status | **Real** (LiveKit) |
| Camera, microphone, screen share (with tab audio), device switching | **Real** |
| Participant tiles, active-speaker ring, connection-quality bars, mute badges | **Real** |
| Room chat | **Real**: LiveKit data messages on topic `km-chat`, not stored |
| "End for everyone" | **Real** signal: every participant is disconnected and sent to the summary |
| Lobby camera preview, mic level meter, device pickers | **Real** |
| After-meeting attendees, duration, chat log | **Real**, taken from the call you were in |
| Concierge, Iris (your dot), Scribe / Researcher / Facilitator / Translator | Simulated tiles, shown to everyone through data messages on `km-ctrl` |
| Recording (Room Composite egress) | Simulated: the notice and timer are shared, but no egress runs |
| Live transcript, summary, action items, S3/IPFS, email/SMS delivery | Simulated sample content, labelled in the UI |
| Sign-in, dashboard, agents registry, recordings library, other settings | Carried over from the simulated prototype |

Sign-in works the same way as in the original prototype: it's local to your browser.
Guests get the Concierge only. Recording and agents unlock after signing in. You can
sign in from a new tab during a call without leaving it.

## How tokens work

`server.mjs` is a small Node server with no dependencies. It serves this folder and
provides:

- `POST /api/token` with `{ room, name, role }`. It checks the room code
  (`km-xxx-xxx`) and the name, then returns `{ url, token }`. The token is an HS256
  JWT signed with `LIVEKIT_API_SECRET` using `node:crypto`. It's valid for 2 hours and
  grants join, publish, subscribe and data for that one room only.
- `GET /api/status` returns the server URL and the first 4 characters of the API key.
  The Settings → LiveKit page uses this.

The API secret never leaves the server process. `server.mjs` and `start.sh` are never
served to the browser.

> This server is for local prototyping. It has no authentication, so anyone who can
> reach the port can get a token for any `km-` room. Keep `HOST` on the default
> (`127.0.0.1`) unless you're on a network you trust.

## Joining from another device

Browsers only allow camera and mic on `localhost` or HTTPS. To join from a phone or
another computer, put an HTTPS tunnel in front of the server and share that URL, for
example `cloudflared tunnel --url http://localhost:5173` or `ngrok http 5173`.

## Files

| Path | What it is |
|---|---|
| `room.html` | Live start, lobby, room and after-meeting screens |
| `assets/live-room.js` | Room engine: LiveKit connection, tiles, controls, chat, simulated agents and recording |
| `assets/live-lobby.js` | Start, lobby (preview and devices), after-meeting screen, routing, token calls |
| `assets/live.css` | Styles specific to the live room, built on `km.css` and `room.css` |
| `assets/room.css` | Room styles taken from `meet.html`, shared so both rooms look the same |
| `assets/vendor/livekit-client.umd.js` | LiveKit browser SDK, a local copy (see below) |
| `server.mjs`, `start.sh` | Local token server and launcher |
| Everything else | The original prototype pages, with "Start a meeting" pointing at the live room |

The SDK is a local copy of `livekit-client` 2.23.0 from npm (Apache-2.0; licence in
`assets/vendor/LICENSE`). To update it, download the new package tarball and replace
`dist/livekit-client.umd.js`.

`meet.html` is still the original fully simulated room, kept for reference. Its own
links (transcript, consent, processing demos) still work.
