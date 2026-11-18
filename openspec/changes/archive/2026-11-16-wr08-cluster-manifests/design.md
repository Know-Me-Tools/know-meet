## Context

Library and pattern decisions come from the Analyze stage (`.kbd-orchestrator/phases/web-release/library-candidates.json`).

## Decisions

### cand-012: Kustomize manifests in this repo with one Argo CD Application (adopt)

Pull-based delivery from a public repo; no cluster credential stored in GitHub.

Evidence:

- Tier 1: Argo CD v3.6.1 is installed with no repository, Application or AppProject. (.kbd-orchestrator/phases/web-release/cluster-context.md)

Risks:

- Argo CD has no repository connected; connecting one is an operator-approved action.
- Image tag promotion needs a pull request, an image updater or a CI commit.

### cand-014: conduit Gateway, Certificate and HTTPRoute manifests (adapt)

Same gateway class and issuer naming as the target baseline.

Evidence:

- Tier 1: Gateway with gatewayClassName eg, HTTPS 443 and HTTP 80 listeners, a Certificate, an HTTPS HTTPRoute and an HTTP redirect route. (https://github.com/Know-Me-Tools/conduit/tree/HEAD/k8s/conduit)

Risks:

- Written for a different cluster (client-cluster); issuer and class names must be verified on the target.

### cand-015: Gateway API ResponseHeaderModifier (adopt)

Headers set once, as response headers, in a reviewed manifest generated from the existing CSP builder.

Evidence:

- Tier 2: Envoy Gateway supports the HTTPRoute ResponseHeaderModifier filter. (https://github.com/envoyproxy/gateway/blob/v1.10.0/site/content/en/news/releases/v0.3.md)
- Tier 1: buildContentSecurityPolicyHeader() exists for hosted serving and is called by no server. (apps/web/scripts/content-security-policy.ts)

Risks:

- Permissions-Policy must allow camera and microphone for this origin.

### cand-016: Operator-created Kubernetes Secret (value on stdin) (adopt)

No secret enters the repo, image or CI. Sufficient for one secret.

Evidence:

- Tier 1: Recorded pattern for this cluster: pipe the value into kubectl create secret ... --from-file=key=/dev/stdin. (surreal-memory:522abb83-981a-47de-b5b7-fb1b44d47ee7)

Risks:

- Manual rotation.
- Not restored from Git if the cluster is rebuilt.
