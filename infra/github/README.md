# Repository rules for `main` (`infra/github`)

Every push to `main` is a public deployment: the `deploy` job of
`.github/workflows/images.yml` pins the new images and Argo CD syncs `main` to
`https://meet.know-me.tools`. The repository ruleset `main` decides who may change `main`.

| File | Purpose |
|---|---|
| `main-ruleset.json` | The ruleset, minus the deploy app's bypass entry (its ID is added when applied). |
| `../../.github/CODEOWNERS` | `infra/**` and `.github/**` need a code-owner review. |

## What the ruleset enforces

For everyone except the two bypass actors below:

- Changes reach `main` only through a pull request. No force push, no deletion.
- The four `ci` jobs must pass: repo rules, Rust, Flutter, native builds.
- A pull request touching `infra/**` or `.github/**` needs a code-owner approval.

Bypass actors:

- **Organisation owners:** pull requests only (`bypass_mode: pull_request`). An owner can
  merge a pull request past *every* rule above, failing checks included, and GitHub records
  the bypass; an owner cannot push to `main` directly. This exists because the repository has
  one maintainer, the only code owner, who cannot approve their own pull request. So for that
  maintainer, green CI and review are a discipline the merge dialog shows, not a gate.
- **Deploy app `know-meet-deployer`:** always. The `deploy` job pushes the image pin commit
  directly to `main` with a one-hour token of this app. The workflow token cannot bypass a
  ruleset, so without the app the deploy push is refused. `always` also overrides the
  force-push and deletion rules, so the app key is as powerful as an owner on `main`. It is
  therefore stored only in environment `production`, which only `main` may deploy to: a
  workflow pushed on any other branch, including a pull request's, cannot read it.

The deploy commit changes four lines of `infra/k8s/overlays/production/kustomization.yaml`;
the job refuses to push anything else. Anyone who can change `.github/workflows/images.yml`
can change that guard, which is why `.github/**` needs a code-owner review.

## Operator setup (once, in this order)

1. **Create the app.** Organisation settings, Developer settings, GitHub Apps, New GitHub
   App. Name `know-meet-deployer`; homepage the repository URL; Webhook **inactive**;
   Repository permissions: **Contents: Read and write** only (Metadata read is implied);
   installable only on this account. Note the **App ID** and the **Client ID**.
2. **Private key.** On the app page, generate a private key (a `.pem` download).
3. **Install.** Install the app on the organisation, *Only select repositories*:
   `know-meet`.
4. **Environment.** Repository settings, Environments, New environment `production`.
   Deployment branches and tags: *Selected branches and tags*, add exactly `main`. No
   required reviewers (that would stop continuous deployment). Then add the environment
   secret and the repository variable, and delete the downloaded key:

   ```bash
   gh secret set KM_DEPLOY_APP_PRIVATE_KEY --repo Know-Me-Tools/know-meet --env production < know-meet-deployer.pem
   gh variable set KM_DEPLOY_APP_CLIENT_ID --repo Know-Me-Tools/know-meet --body '<client id>'
   ```

   Do not also store the key as a repository secret.

5. **Merge** the pull request that switches the `deploy` job to the app token.
6. **Apply the ruleset**, with the App ID from step 1:

   ```bash
   jq --argjson id "<app id>" \
     '.bypass_actors += [{actor_id: $id, actor_type: "Integration", bypass_mode: "always"}]' \
     infra/github/main-ruleset.json \
     | gh api -X POST repos/Know-Me-Tools/know-meet/rulesets --input -
   ```

   To change it later, `PUT repos/Know-Me-Tools/know-meet/rulesets/<ruleset id>` with the
   same input. Keep this file in step with the live ruleset.

If the app key leaks: revoke the key on the app page, generate a new one, replace the
environment secret. The token it mints can write repository contents only, in this repository
only, but with the ruleset bypass that includes rewriting `main`.
