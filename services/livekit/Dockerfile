# Know Meet token service image (wr07 task 7.2).
#
# Build context: the repository root.
#   docker build -f services/livekit/Dockerfile \
#     -t ghcr.io/know-me-tools/know-meet-token-service:<commit-sha> .
#
# Nothing secret is a build argument, an ENV or a layer of this image. LIVEKIT_URL,
# LIVEKIT_API_KEY and LIVEKIT_API_SECRET are read from the environment when the
# container starts (see services/livekit/README.md and src/config/mod.rs).
#
# Runtime contract, taken from the service code:
#   listens   KM_BIND_ADDR, default 0.0.0.0:8080
#   health    GET /api/healthz -> 200 (no Origin header, no rate limit)
#   required  LIVEKIT_URL (wss://), LIVEKIT_API_KEY, LIVEKIT_API_SECRET, KM_SITE_ORIGIN,
#             KM_TRUSTED_PROXY_HOPS (0 to 8)
#   optional  KM_BIND_ADDR, KM_TOKEN_TTL_SECONDS, KM_RATE_LIMIT_BURST,
#             KM_RATE_LIMIT_REFILL_SECONDS, KM_CODE_TTL_SECONDS, KM_MAX_STORED_CODES,
#             KM_REQUEST_TIMEOUT_SECONDS, KM_ROOM_MAX_PARTICIPANTS,
#             KM_ROOM_EMPTY_TIMEOUT_SECONDS, RUST_LOG
# The service writes no file, so the container can run with a read-only root filesystem.
# The base has no shell or curl, so there is no HEALTHCHECK instruction: probe
# /api/healthz from outside (a Kubernetes httpGet probe).
#
# Why a musl build on the pinned static distroless base: the crate has no C dependency
# (livekit-api is built with only the access-token feature: no reqwest, no TLS stack, and
# livekit-token signs with HMAC through RustCrypto crates). A musl target therefore links
# statically, which is the only kind of binary gcr.io/distroless/static can run. A glibc
# build would fail at start with "no such file or directory" on that base. If a future
# dependency needs OpenSSL or another C library, the musl build fails here, at build time.
#
# Bases are pinned by tag and by the multi-arch index digest the registry reported for
# that tag on 2026-11-15 (Docker-Content-Digest of the manifest index). Bump tag and
# digest together, in step with versions.toml.

FROM rust:1.97.1-slim-trixie@sha256:8e8cf8f7fd54a2d23d5a743b3a03f56e26b6c774276c33fa0595111704ebb15c AS build
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
WORKDIR /build

# rust-toolchain.toml is kept out of the workspace directory so rustup does not try to
# install its components; it is only compared with the compiler the builder image carries.
COPY rust-toolchain.toml /usr/src/rust-toolchain.pin
RUN <<'EOF'
set -euo pipefail
pinned="$(sed -n 's/^channel = "\(.*\)"$/\1/p' /usr/src/rust-toolchain.pin)"
actual="$(rustc --version | cut -d' ' -f2)"
if [ -z "$pinned" ] || [ "$pinned" != "$actual" ]; then
  echo "rust-toolchain.toml pins '${pinned}' but the builder image has '${actual}': update the FROM line" >&2
  exit 1
fi
rust_target="$(rustc -vV | sed -n 's/^host: \(.*\)-gnu$/\1-musl/p')"
if [ -z "$rust_target" ]; then
  echo "the builder host triple is not a -gnu triple" >&2
  exit 1
fi
rustup target add "$rust_target"
EOF

# Every Cargo workspace member manifest must be present for Cargo to load the workspace,
# so the workspace trees are copied whole (the root .dockerignore drops target/ and secrets).
COPY Cargo.toml Cargo.lock ./
COPY crates crates
COPY services services
COPY apps/desktop/src-tauri apps/desktop/src-tauri

# The musl targets link the C runtime statically by default; the INTERP check below proves it.
ENV CARGO_TERM_COLOR=never \
    CARGO_PROFILE_RELEASE_STRIP=symbols

RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/build/target,id=km-token-service-target,sharing=locked \
    <<'EOF'
set -euo pipefail
rust_target="$(rustc -vV | sed -n 's/^host: \(.*\)-gnu$/\1-musl/p')"
cargo build --locked --release --package km-token-service --target "$rust_target"
bin="target/${rust_target}/release/km-token-service"
# A binary with a program interpreter is dynamically linked and cannot start on the base.
headers="$(readelf -lW "$bin")"
case "$headers" in
  *INTERP*)
    echo "km-token-service is dynamically linked" >&2
    exit 1
    ;;
esac
install -D -m 0555 "$bin" /out/km-token-service
EOF

FROM gcr.io/distroless/static-debian13:nonroot@sha256:aafe993665bf6200db38a02c11a9351e782a84b6a45e7f33b6695638c88e3931 AS runtime
LABEL org.opencontainers.image.title="know-meet-token-service" \
      org.opencontainers.image.description="Know Meet token service: room codes and short-lived LiveKit guest tokens" \
      org.opencontainers.image.source="https://github.com/Know-Me-Tools/know-meet"

COPY --from=build --chown=0:0 --chmod=0555 /out/km-token-service /usr/local/bin/km-token-service

# Numeric non-root user (the base's `nonroot` account), so a Kubernetes runAsNonRoot check
# can verify it without reading /etc/passwd.
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/km-token-service"]
