## ADDED Requirements

### Requirement: One command per concern covers every surface

Root build, test and lint commands exercise web, desktop, Rust/BFF and Flutter and fail on warnings.

#### Scenario: Build

- **WHEN** the build command runs
- **THEN** web, Tauri debug, BFF, Flutter APK and iOS simulator builds all succeed or it exits non-zero

