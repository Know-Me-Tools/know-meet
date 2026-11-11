## ADDED Requirements

### Requirement: Mobile uses generated theming

The Flutter app's ThemeData comes from generated tokens in both modes.

#### Scenario: Theme matches tokens

- **WHEN** the app starts in dark or light
- **THEN** ThemeData values equal the generated Dart tokens

