# Hosted Know Meet web bundle on static-web-server (wr07 task 7.1).
#
# Build context: the repository root.
#   docker build -f apps/web/Dockerfile \
#     --build-arg KM_LIVEKIT_URL=wss://livekit.example.com \
#     -t ghcr.io/know-me-tools/know-meet-web:<commit-sha> .
#
# KM_LIVEKIT_URL is the public LiveKit signalling URL (a bare wss:// origin). It is
# not a secret: it is compiled into the Content-Security-Policy. LIVEKIT_API_KEY and
# LIVEKIT_API_SECRET are never build arguments, environment or layers of this image.
#
# Stage 1 builds the bundle so CI needs no earlier build step. Node and pnpm are the
# repository pins (package.json engines and packageManager; pnpm-workspace.yaml sets
# engineStrict, so the Node version must match exactly).
# Digest pins: both bases are tag-pinned; digests are filled in by the release owner
# (see the wr07 report).

FROM node:26.5.0-trixie-slim AS build
ARG PNPM_VERSION=11.15.0
ARG KM_LIVEKIT_URL
ARG KM_MEDIA_ORIGINS=""
RUN npm install --global "pnpm@${PNPM_VERSION}" && pnpm --version
WORKDIR /repo

# Install layer: manifests only, so source edits do not invalidate the dependency
# install. pnpm needs every workspace manifest to check the frozen lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/desktop/package.json apps/desktop/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/realtime/package.json packages/realtime/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY tests/fidelity/package.json tests/fidelity/package.json
COPY tests/release/package.json tests/release/package.json
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store \
      --filter "@know-meet/web..."

# Sources the web build reads: the app, the workspace packages it imports, and the
# shared tsconfig. Tauri, Flutter, docs, tests and services stay out of the context.
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages

RUN test -n "${KM_LIVEKIT_URL}" || { echo "KM_LIVEKIT_URL build argument is required" >&2; exit 1; }
# Writes apps/web/dist-hosted/ and apps/web/dist-hosted-csp.txt.
RUN KM_LIVEKIT_URL="${KM_LIVEKIT_URL}" KM_MEDIA_ORIGINS="${KM_MEDIA_ORIGINS}" \
    pnpm --filter @know-meet/web run build:hosted

# Optional target: only the CSP header value the Gateway sets (WR-3 reads it).
#   docker build -f apps/web/Dockerfile --target csp-artifact --output type=local,dest=out ...
FROM scratch AS csp-artifact
COPY --from=build /repo/apps/web/dist-hosted-csp.txt /dist-hosted-csp.txt

# Runtime: the server binary and the bundle only. The image has no shell and no
# package manager. It sets no Strict-Transport-Security: the Gateway adds the
# security headers in the cluster, and WR-3's negative control relies on that.
FROM joseluisq/static-web-server:2.44.2

COPY --from=build /repo/apps/web/dist-hosted /public
COPY apps/web/static-web-server.toml /etc/static-web-server/static-web-server.toml

# SERVER_PORT, SERVER_ROOT, SERVER_HEALTH, SERVER_SECURITY_HEADERS, SERVER_LOG_LEVEL and
# SERVER_CONFIG_FILE are static-web-server 2.44.2 settings (src/settings/cli.rs).
# SERVER_FALLBACK_PAGE is deliberately unset: see static-web-server.toml.
ENV SERVER_PORT=8080 \
    SERVER_ROOT=/public \
    SERVER_CONFIG_FILE=/etc/static-web-server/static-web-server.toml \
    SERVER_HEALTH=true \
    SERVER_SECURITY_HEADERS=false \
    SERVER_LOG_LEVEL=info

# Numeric non-root user: valid on a scratch image that has no /etc/passwd, and what a
# Kubernetes runAsNonRoot check needs.
USER 10001:10001
EXPOSE 8080
