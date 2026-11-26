# meeting-local-transcription Specification

## Purpose
TBD - created by archiving change local-01-consent-and-timed-search. Update Purpose after archive.

## Requirements

### Requirement: KMT-R1 Explicit local model readiness and KMT-R2 requester-only consent

The system SHALL distinguish opting into a disclosed model download from each meeting’s exact grant of transcription and text retention. It SHALL only capture affirmatively authorized sources; late, replaced, unknown or withdrawn sources SHALL be excluded or paused safely. Only the requester SHALL see or retain the transcript. The established local recorder remains separate.

#### Scenario: KMT-1 Operator opts in and the room controls audio intake

- **WHEN** a fresh Chromium profile joins a fictional meeting, opts into the displayed local model and requests transcription, one participant joins late and another withdraws
- **THEN** an independent browser/worker witness finds no model request before opt-in, no unauthorized audio reaches transcription, and no other participant can see or save the private transcript

### Requirement: KMT-R3 Find settled meeting-relative speech

The requester SHALL be able to find already-settled authorized speech by terms and navigate to its meeting-relative time while the call continues. The system SHALL distinguish provisional and settled speech, mark missing/degraded coverage and SHALL NOT move the feature to a cloud provider.

#### Scenario: KMT-2 Catch a missed detail without interrupting

- **WHEN** a scripted fictional participant speaks a known commitment and local capacity is checked while the meeting continues
- **THEN** the requester can find the exact settled quote and observe its timestamp; an independently witnessed capacity failure preserves the call, presents a truthful gap or unavailable state and sends no captured or derived content to a processing service

### Requirement: KMT-R4 Retention and deletion stay in the chosen profile

Consented retained text and derived local search data SHALL reopen only in the requester’s browser profile. Delete SHALL remove the transcript and its derived local data without deleting an independently authorized recording. An incomplete write SHALL NOT be reported as saved.

#### Scenario: KMT-3 Reopen and delete a local transcript without affecting the recording

- **WHEN** the requester leaves a fictional meeting with approved transcript retention and a separately managed recording, then reopens and deletes the transcript
- **THEN** the same profile sees retained text before deletion, another profile does not see it, incomplete saves are honest, and transcript/search artifacts are gone after deletion while the separate recording remains
