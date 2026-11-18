# token-service Specification

## Purpose
TBD - created by archiving change wr03-token-service. Update Purpose after archive.

## Requirements

### Requirement: Tokens are scoped, short-lived and issued only for service-generated rooms

The system SHALL satisfy the following. The service signs tokens with the LiveKit API secret read from its environment and never returns or logs the secret.

#### Scenario: Token for a generated room

- **WHEN** a client requests a token for a code the service generated
- **THEN** the token grants join to that one room, expires within the configured short lifetime and carries no admin or room-create grant

#### Scenario: Arbitrary room refused

- **WHEN** a client requests a token for a room name it chose
- **THEN** the service responds 404 and issues nothing

#### Scenario: Missing configuration

- **WHEN** the service starts without a required LIVEKIT_ variable
- **THEN** it exits non-zero with a message naming the variable and not its value

### Requirement: The public endpoints bound abuse

The system SHALL satisfy the following. Each abuse control exists because anyone on the internet can call the endpoint and usage is billed.

#### Scenario: Rate limit

- **WHEN** one client exceeds the configured request rate
- **THEN** further requests receive 429 until the window passes

#### Scenario: Foreign origin

- **WHEN** a request carries an Origin other than the configured site origin
- **THEN** it is refused

#### Scenario: Client address behind the Gateway

- **WHEN** requests arrive through the Gateway
- **THEN** the limit is keyed on the forwarded client address, not the Gateway address
