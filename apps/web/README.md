# @know-meet/web

The React 19 web app. The Tauri desktop host loads the same default build.

## Builds

| Script | Output | Use |
|---|---|---|
| `pnpm --filter @know-meet/web run build` | `dist/` | Default build: every route. Desktop (Tauri) and local development. |
| `pnpm --filter @know-meet/web run build:hosted` | `dist-hosted/` and `dist-hosted-csp.txt` | Hosted build for the public site: web bundle only, no Tauri or Flutter. |

## Hosted build

The hosted build serves three paths: `/` (home), `/join` (lobby) and `/meet` (meeting
room). Every other path, including `/dashboard`, `/agents`, `/recordings`, `/settings`,
`/notes` and `/auth`, renders the not-found state (`data-testid="km-not-found"`). It has
no primary navigation, no sign-in or account entry point, and ignores `localStorage`
`km-auth`. The default build is unchanged.

How it works:

- `KM_BUILD_MODE=hosted` selects the mode. `build:hosted` sets it; `scripts/build-mode.ts`
  is the only reader of the variable, and `vite.config.ts` turns it into the build-time
  constant `__KM_HOSTED__`.
- `src/app/build-mode.ts` exports `HOSTED_BUILD`, the one place the app reads the flag.
- `src/app/router.tsx` picks `hosted-router.tsx` or `default-router.tsx`. The hosted tree
  does not import the excluded screens.

### Input

| Variable | Required | Meaning |
|---|---|---|
| `KM_LIVEKIT_URL` | yes, for `build:hosted` | Public LiveKit signalling URL, a bare `wss://host[:port]` origin. Not a secret. Added to `connect-src` (`wss://` and `https://` of that host). The build stops with a message naming this variable if it is missing or not a bare `wss://` origin. |
| `KM_MEDIA_ORIGINS` | no | Comma-separated `https://` origins for agent-rendered media. |

`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are never read by this build and never enter
the bundle. Clients receive short-lived tokens from the token service.

```bash
KM_LIVEKIT_URL=wss://livekit.example.com pnpm --filter @know-meet/web run build:hosted
```

### Content-Security-Policy artifact

`apps/web/dist-hosted-csp.txt` holds the exact value of
`buildContentSecurityPolicyHeader` for the same inputs: one line, no trailing newline. It
is the `Content-Security-Policy` response header the Gateway sets on HTML responses. The
`<meta>` tag in `dist-hosted/index.html` comes from `buildContentSecurityPolicy` with the
same inputs, so the header is the meta policy plus `frame-ancestors 'none'` (a directive
browsers ignore in a `<meta>` tag). The file sits next to `dist-hosted/`, not inside it,
so the web server does not serve it. A failed build removes any older copy first.

The release suite reads it through `KM_RELEASE_CSP_FILE`:

```bash
KM_RELEASE_CSP_FILE="$PWD/apps/web/dist-hosted-csp.txt"
```

## Tests

`pnpm --filter @know-meet/web run test` runs the unit tests in `tests/unit`, including
the build-mode switch and the CSP artifact writer.
