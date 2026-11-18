## ADDED Requirements

### Requirement: The deployment is defined in Git and applied by Argo CD

The system SHALL satisfy the following. Manifests are written against the cluster facts observed in task 1.6.

#### Scenario: Sync

- **WHEN** the Argo CD Application is applied
- **THEN** Argo CD creates the namespace, workloads, routes and certificate and reports Synced and Healthy

#### Scenario: Pinned tag

- **WHEN** the production overlay is rendered
- **THEN** both images are pinned to one commit SHA

### Requirement: Traffic is routed and protected at the Gateway

The system SHALL satisfy the following. Only the hostname meet.know-me.tools appears on any route.

#### Scenario: Route split

- **WHEN** a request for /api/... arrives
- **THEN** it reaches the token service; any other path reaches the static server

#### Scenario: Redirect

- **WHEN** a request arrives over HTTP
- **THEN** it is redirected to HTTPS

#### Scenario: Headers

- **WHEN** any HTTPS response is returned
- **THEN** it carries HSTS, the generated CSP, nosniff, frame denial, Referrer-Policy and a Permissions-Policy allowing camera and microphone for this origin only

### Requirement: No secret value is in any manifest

The system SHALL satisfy the following. The operator creates the Secret from the shell with the value on stdin.

#### Scenario: Secret reference

- **WHEN** the manifests are rendered
- **THEN** they name the Secret and contain no secret value
