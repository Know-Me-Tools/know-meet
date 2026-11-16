# Goals

- Ship a web-only release of Know Meet (the React 19 web app) at https://meet.know-me.tools
- Desktop (Tauri) and mobile (Flutter) are out of scope for this release
- Use the Surreal Memory MCP server to extract how the target cluster is set up (ingress, TLS, DNS, registry, GitOps, namespaces, secrets) and configure the deployment to match it; record the findings with their sources
- Plan the release specifically: what the web build needs to run in production, how it is built, packaged, deployed and verified at the public URL
- Secrets (LIVEKIT_* and any others) stay server-side and out of the repo; clients receive short-lived tokens
- Follow the full KBD process (assess, analyze, plan, execute, reflect) with OpenSpec changes; no shortcuts
