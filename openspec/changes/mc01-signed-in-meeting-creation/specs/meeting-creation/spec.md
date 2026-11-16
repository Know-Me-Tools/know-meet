## ADDED Requirements

### Requirement: Only a signed-in host can start a LiveKit meeting

The system SHALL start a LiveKit meeting only for a request carrying a session the server
verified with the identity provider, and SHALL key every creation limit on the verified
account ID.

#### Scenario: Signed-in host starts a meeting

- **WHEN** a signed-in host asks to start a meeting and is under the account limits
- **THEN** the service creates the room in LiveKit with the configured empty timeout and participant cap and returns an invite

#### Scenario: Anonymous request

- **WHEN** a request without a verified session asks to start a LiveKit meeting
- **THEN** the service refuses it with 401 and creates no room, except on the interim guest path while decision D1 keeps it

#### Scenario: Account at its limit

- **WHEN** a host already holds the configured number of live meetings or has started the daily maximum
- **THEN** the service responds 429 with a Retry-After and creates no room

#### Scenario: Client-chosen account

- **WHEN** a request names an account ID in its body or headers
- **THEN** the service ignores it and uses only the verified session's account

### Requirement: Invitees join without an account and cannot guess their way in

The system SHALL admit invitees with no account, SHALL accept only invites the server
signed, and SHALL NOT let a guessed short code admit anyone without the host's approval.

#### Scenario: Valid invite link

- **WHEN** an invitee opens an unexpired invite link for a room that exists in LiveKit
- **THEN** the service issues a short-lived token that grants join to that one room

#### Scenario: Tampered or expired link

- **WHEN** the invite's signature does not verify or its expiry has passed
- **THEN** the service responds 404 and issues nothing

#### Scenario: Short code

- **WHEN** someone enters a valid short code
- **THEN** they wait in the room's waiting room until the host admits them, and receive no token before that

### Requirement: Room state lives in LiveKit

The system SHALL treat the LiveKit room as the record of a meeting and SHALL keep no
process-local list of valid rooms.

#### Scenario: Service restart

- **WHEN** the token service restarts during a meeting
- **THEN** existing invites for that meeting keep working

#### Scenario: Abandoned room

- **WHEN** a room stays empty past its empty timeout
- **THEN** LiveKit deletes it and its invites stop working
