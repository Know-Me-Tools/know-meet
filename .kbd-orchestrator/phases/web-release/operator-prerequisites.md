# Operator prerequisites: web-release

Output of task 1.5 (`wr01-release-scenarios`). Researched read-only by the
build-platform role on 2026-11-15, 12:18 UTC. Nothing was installed or built,
so every compatibility statement below is from registry metadata only.

## How pins work in this repo

- Root `versions.toml` is the authoritative record by policy (AGENTS.md). Its
  `[pins]` table is empty, agents are denied edits to it, and no check reads
  it. Adding to it is a record, not a gate.
- `tooling/versions.toml` is the file `pnpm run lint:pins` enforces. It holds
  toolchain pins only (Rust, Node, pnpm, TypeScript and similar) and is a
  byte-identical copy of the generator's file. This phase does not touch it.
- `lint:pins` does not inspect npm dependencies, crates, Dockerfiles or
  workflows. The new dependencies are exact-pinned in their own manifests
  (`saveExact` for npm, `=x.y.z` for Cargo), which is the existing convention.
- pnpm rejects packages published less than 24 hours ago. The default value
  was not confirmed from the pnpm docs; the previous phase's decision log
  records the rule blocking an install.

## Batch 1: what the operator does

### 1. Add these pins to root `versions.toml`

Proposed block, in the file's `name = "x.y.z"` form. Scoped npm names are
written without `@` and `/` because TOML bare keys cannot hold them; rename
freely.

```toml
[pins]
# npm
livekit-client = "2.24.1"                 # Apache-2.0; published 2026-11-14. Fallback if the age rule blocks it: 2.24.0
dom-mediacapture-record-types = "1.0.22"  # @types/dom-mediacapture-record; MIT; peer of livekit-client
axe-core-playwright = "4.14.0"            # @axe-core/playwright; MPL-2.0; already used by tests/fidelity
playwright-test = "1.65.0"                # @playwright/test; existing repo pin, not bumped (registry latest is 1.65.1)

# crates for services/livekit
livekit-api = "0.10.2"                    # Apache-2.0; default-features = false, features = ["access-token"]
tower_governor = "0.8.0"                  # MIT OR Apache-2.0; candidate, still to be evaluated in task 3.3
tracing-subscriber = "0.3.23"             # MIT; not yet in Cargo.lock
getrandom = "0.4.3"                       # MIT OR Apache-2.0; already in Cargo.lock; for room codes
serde_json = "1.0.145"                    # already in Cargo.lock at this version
tracing = "0.1.44"                        # already in Cargo.lock at this version
thiserror = "2.0.17"                      # already in Cargo.lock at this version

# container bases (recorded only; pinned by digest when the Dockerfiles are written)
static-web-server-image = "joseluisq/static-web-server:2.44.2"
rust-builder-image = "rust:1.97.1-slim-trixie"
runtime-base-image = "gcr.io/distroless/static-debian13:nonroot"
```

### 2. Authenticate to the cluster

Run `gcloud auth login travis@know-me.tools` in your own terminal. A
read-only `kubectl get namespaces` on 2026-11-15 failed with
"Reauthentication failed". Task 1.6 needs this.

## What the roles do themselves (no operator action)

- build-platform adds `services/livekit` to the root Cargo workspace members
  and regenerates `pnpm-lock.yaml`. `packages/*` and `tests/*` are already
  workspace globs.
- build-platform extends `tooling/ls-lint/ls-lint.yml`: a capitalised
  `Dockerfile` fails the kebab-case rule today even though CLAUDE.md lists it
  as an allowed name, and each new package's `node_modules` needs an ignore
  entry. The 500-line check already covers Dockerfile, YAML and shell files.

## Unconfirmed, carried to later tasks

1. `livekit-client` 2.24.1 cleared the 24-hour age window only on 2026-11-15
   at 09:48 UTC. Its transitive dependencies were not age-checked.
2. `livekit-token` depends on `jsonwebtoken` with default features off.
   Whether signing works without enabling a crypto backend feature is not
   known until the first build, which under VLBV is at the boundary. Task 3.2
   must read the crate source to settle this before writing code.
3. `tower_governor` 0.8.0 is 15 months old. Its metadata is satisfiable by the
   current lock (axum 0.8.8, tower 0.5.3); compilation is unverified.
4. The distroless `static` runtime base has no libc, so the token service must
   be built for a musl target, or the base changes to a `cc` flavour. Decide
   in task 7.2.
5. `static-web-server` publishes to Docker Hub. GHCR is the destination for
   Know Meet's images, not the source of this base.
6. `check-boundaries.ts` and `check-secrets.ts` were not read closely; whether
   `packages/realtime` needs a boundary-rule entry is settled in task 2.3.
7. Nothing detects drift between root `versions.toml` and the manifests.
