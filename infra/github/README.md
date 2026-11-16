# Repository rules for `main` (`infra/github`)

Every push to `main` is a public deployment: the `deploy` job of
`.github/workflows/images.yml` pins the new images and Argo CD syncs `main` to
`https://meet.know-me.tools`. The repository ruleset `main` decides who may change `main`.

| File | Purpose |
|---|---|
| `main-ruleset.json` | The ruleset, minus the deploy app's bypass entry (its ID is added when applied). |
| `../../.github/CODEOWNERS` | `infra/**` and `.github/**` need a code-owner review. |

## What the ruleset enforces

- Changes reach `main` only through a pull request. No force push, no deletion.
- The four `ci` jobs must pass: repo rules, Rust, Flutter, native builds.
- A pull request touching `infra/**` or `.github/**` needs a code-owner approval.
- **Bypass, organisation admins:** pull requests only (`bypass_mode: pull_request`). An admin
  can merge their own pull request without an approval, and GitHub records the bypass; an
  admin cannot push to `main` directly. This exists because the repository has one
  maintainer, who cannot approve their own pull request.
- **Bypass, deploy app:** always. The `deploy` job pushes the image pin commit directly to
  `main` with a one-hour token of the GitHub App `know-meet-deployer`. The workflow token
  cannot bypass a ruleset, so without the app the deploy push is refused.

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
4. **Repository settings.** Add variable `KM_DEPLOY_APP_CLIENT_ID` (the Client ID) and
   secret `KM_DEPLOY_APP_PRIVATE_KEY` (the whole `.pem`). Then delete the downloaded key:

   ```bash
   gh variable set KM_DEPLOY_APP_CLIENT_ID --repo Know-Me-Tools/know-meet --body '<client id>'
   gh secret set KM_DEPLOY_APP_PRIVATE_KEY --repo Know-Me-Tools/know-meet < know-meet-deployer.pem
   ```

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

If the app key leaks: revoke the key on the app page, generate a new one, replace the secret.
The token it mints can write repository contents only, in this repository only.
