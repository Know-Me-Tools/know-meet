## ADDED Requirements

### Requirement: Each image runs non-root and contains no secret

The system SHALL satisfy the following. Secrets reach the token service only at run time from its environment.

#### Scenario: Page fallback

- **WHEN** the static image receives a request for /join
- **THEN** it returns the app document with status 200

#### Scenario: Missing asset

- **WHEN** the static image receives a request for a missing asset
- **THEN** it returns 404

#### Scenario: Secret scan

- **WHEN** the artifact scan runs on both images and the bundle
- **THEN** no LIVEKIT_ value or token-shaped string is found

#### Scenario: Non-root

- **WHEN** either container starts
- **THEN** its process does not run as root

### Requirement: Images are published with immutable tags

The system SHALL satisfy the following. A tag is the commit SHA and is never reused.

#### Scenario: Publish

- **WHEN** the workflow runs on a commit
- **THEN** both images are pushed to ghcr.io/know-me-tools tagged with that SHA and their digests are recorded
