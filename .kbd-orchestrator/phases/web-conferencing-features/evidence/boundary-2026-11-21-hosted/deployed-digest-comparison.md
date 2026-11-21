# Deployed digest comparison (2026-11-21)

Merged commit: 59543ab17c300d872e076921032251f7e30d04a2 (PR #16).
Image build: https://github.com/Know-Me-Tools/know-meet/actions/runs/44892679081 (success).
Deploy commit: 45508dd7 (know-meet-deployer bot) pins
- web ghcr.io/know-me-tools/know-meet-web@sha256:6d0ea4bb774832e9be90b016304704e5cfca954c90a1a2f984fcbdf5a600cf7e
- token service ghcr.io/know-me-tools/know-meet-token-service@sha256:af9c51f6edf20088220f7676a85f529b149fb6d66aa515eaded39daf60b6df36

Cluster read (kubectl) was not possible: gcloud credentials need an interactive re-login.
Instead, the files served by https://meet.know-me.tools were compared with the files inside the pinned web image:

| File | Image (sha256) | Live (sha256) |
| --- | --- | --- |
| index.html | 3b9c611bc2a699e33a0379163a120e9e683e02e47c27f017afc6688caef278b7 | 3b9c611bc2a699e33a0379163a120e9e683e02e47c27f017afc6688caef278b7 |
| /assets/index-kAXt8q3A.js | 4816ac8ce1e431622e03dc4862aee154955c5a4490a285fa4f90034bf3ce596b | 4816ac8ce1e431622e03dc4862aee154955c5a4490a285fa4f90034bf3ce596b |

Live index.html last-modified: Sat, 21 Nov 2026 10:07:00 GMT.
Result: the live web content is byte-identical to the pinned web image. The token service digest is not verified by this method (no content to compare); /api/healthz returns 200.
