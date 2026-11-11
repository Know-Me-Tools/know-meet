## ADDED Requirements

### Requirement: Desktop runs the web bundle

The Tauri app serves exactly the apps/web build and the plain web build works without Tauri.

#### Scenario: Same bundle

- **WHEN** both are built
- **THEN** the desktop frontendDist digest equals the apps/web/dist digest

#### Scenario: No Tauri runtime

- **WHEN** the web build is opened in a browser
- **THEN** the home route renders with zero console errors

