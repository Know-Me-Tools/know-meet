# Artifact scan contract (WR-6)

Contract for `tooling/release/src/scan-artifacts.ts`, implemented in
`wr07-container-images` task 7.2 (livekit-platform; the file path is under
`tooling/`, which build-platform owns: see plan.md, Review record). Defined in
`wr01-release-scenarios` task 1.2. Scenario: `features/wr-6-secret-hygiene.feature`.
Classification: safety.

## Purpose

Prove that no LiveKit credential and no access token is present in anything
this release ships or publishes: tracked files, the hosted web bundle, the two
container images and the rendered production manifests. The scan complements
`pnpm run lint:secrets` (assignment patterns in tracked files) by comparing
actual secret values and by reaching built artifacts.

## Invocation

```bash
node tooling/release/src/scan-artifacts.ts \
  [--bundle apps/web/dist] \
  [--image know-meet-web:boundary] \
  [--image know-meet-livekit:boundary] \
  [--manifests <file or directory of rendered Kustomize output>] \
  [--repo .]
```

The boundary packet calls it with no arguments, so the defaults are the
release inputs:

| Input | Default | How it is read |
|---|---|---|
| Tracked files | `--repo .` | `git ls-files -z`, then each file's bytes. Untracked and ignored files are out of scope. |
| Web bundle | `--bundle apps/web/dist` (the `build:hosted` output directory; wr06 names it, and the default follows that name) | Every file under the directory, recursively. |
| Images | `--image know-meet-web:boundary` and `--image know-meet-livekit:boundary` (repeatable; the tags the packet builds) | `docker image inspect` for `Config.Env`, `Config.Labels`, `Config.Cmd`, `Config.Entrypoint`; `docker image save` for every layer, every file in each layer tar, and the image config JSON. |
| Rendered manifests | `--manifests`, default: `kustomize build infra/k8s/overlays/production` run by the tool (or `kubectl kustomize`), output held in memory | Every YAML document. |

A missing input (bundle directory absent, image not present locally, render
command fails) is an error, exit 2. The scan never skips an input silently.
The tool runs no network command and never pushes, pulls or deletes an image.

## What it detects

Every finding has a **class**. Classes are fixed strings:

1. `livekit-env-value`: the byte sequence of the value of any environment
   variable whose name starts with `LIVEKIT_` in the scanning process's
   environment, found anywhere in any input. Compared by exact value. Values
   shorter than 8 characters are skipped and reported as a count in the
   summary (too short to compare meaningfully), never by name and value.
   `LIVEKIT_URL` is public; it is excluded from this class by name, and the
   exclusion is stated in the summary. If no `LIVEKIT_` variable other than
   `LIVEKIT_URL` is set, the scan exits 2: without the values, the strongest
   check cannot run.
2. `livekit-api-secret-shape`: a LiveKit-API-secret-shaped string, a run of
   32 or more characters from `[A-Za-z0-9]` immediately following a
   LiveKit-secret-like key (`LIVEKIT_API_SECRET`, `livekit_api_secret`,
   `apiSecret`, `api_secret`, any case) and an assignment (`=`, `:`, `":"`,
   `=>`), within the same line or YAML/JSON key-value pair.
3. `jwt`: a JWT-shaped string,
   `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}`.
   Header and payload both decode to JSON objects to count.
4. `manifest-secret-value`: in rendered manifests, any `kind: Secret` document
   with a non-empty `data` or `stringData` field, and any container `env`
   entry with a literal `value` whose name starts with `LIVEKIT_` other than
   `LIVEKIT_URL`.

Allowed, never a finding:

- A manifest that refers to the Secret by name only: `envFrom.secretRef.name`,
  `env[].valueFrom.secretKeyRef.name` and `.key`. These are the expected form.
- The variable names themselves (`LIVEKIT_API_SECRET` as text with no value).
- The public `LIVEKIT_URL` value and the CSP that contains its origin.

There is no path allowlist. A real finding is fixed at its source, not excused.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every input was read and nothing was found. |
| 1 | At least one finding. |
| 2 | The scan could not complete: a missing input, an unreadable layer, a failed render, a missing `LIVEKIT_` value. Not a pass. |

## Output

Plain text on stdout, one line per finding, then a summary. A machine-readable
copy goes to `--json <path>` when given.

```text
FINDING livekit-env-value image:know-meet-livekit:boundary layer:3f2a…/etc/app.env
FINDING jwt bundle:apps/web/dist/assets/index-5c1d.js
FINDING manifest-secret-value manifests:Secret/know-meet/livekit (data)
SUMMARY inputs=5 files=1834 findings=3 short-values-skipped=0 excluded=LIVEKIT_URL
```

Rules:

- A line names the class and the location only: input kind, image reference,
  layer digest prefix, path, manifest kind/namespace/name. It never contains
  the matched text, any part of it, its length, a hash of it, or the name of
  the environment variable whose value matched (`livekit-env-value` alone).
- stderr carries errors in the same form. Exceptions are caught and reprinted
  without their message when the message could contain input bytes.
- The tool never writes secret values to disk, including temporary files.
  Layer tars are streamed or unpacked into a temporary directory removed on
  exit; matching happens in memory.

## Negative control

Built outside the committed tree, at the boundary, by the bdd-quality role:

```bash
scratch=$(mktemp -d)
printf 'FROM scratch\nENV LIVEKIT_API_SECRET=%s\n' "$KM_DUMMY_SECRET" > "$scratch/Dockerfile"
docker build -t know-meet-scan-control:boundary "$scratch"
LIVEKIT_API_SECRET="$KM_DUMMY_SECRET" node tooling/release/src/scan-artifacts.ts \
  --image know-meet-scan-control:boundary --bundle <empty dir> --manifests <empty file>
```

`KM_DUMMY_SECRET` is a fresh random 40-character alphanumeric value generated
for the run and never a real credential. Expected: exit 1, with at least the
`livekit-env-value` and `livekit-api-secret-shape` findings for
`image:know-meet-scan-control:boundary`, and no line containing the dummy
value. The run fails if the exit is 0 or 2, or if the dummy value appears in
stdout or stderr (checked by the runner with a fixed-string search of the
captured output). The scratch image is removed in cleanup.

## Evidence

Scan stdout, stderr and the JSON report, the argv and exit code of the real
scan and of the negative control, under the boundary evidence folder.
