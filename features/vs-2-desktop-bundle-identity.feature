# Contract VS-2. Owner tasks: c06/6.2, c09/9.2, c13/13.2.
# Oracle: the frontendDist content digest equals the apps/web/dist digest; the app launches to the
# home route with the custom titlebar.
# Negative control: a desktop build pointed at a separately built copy with one changed byte must
# report a digest mismatch.
@VS-2 @value-critical @cli @desktop @boundary-only
Feature: VS-2 Desktop runs the identical web bundle in a branded native window
  As a Know Meet user on macOS
  I need the desktop app to be the same product as the web app
  So that both look and behave the same and only one bundle is maintained

  Background:
    Given the web bundle has been built once into "apps/web/dist"

  @smoke
  Scenario: The desktop build embeds the web build byte for byte
    When the desktop debug build is produced with "pnpm --filter @know-meet/desktop tauri build --debug"
    Then the command exits 0
    And frontendDist in "apps/desktop/src-tauri/tauri.conf.json" resolves to "apps/web/dist"
    And the bundle-identity check reports the same content digest for frontendDist and "apps/web/dist"
    And the digest pair is recorded as evidence

  Scenario: The desktop app opens on the home route with the custom titlebar
    Given the desktop debug build exists
    When the desktop app is launched
    Then a native Know Meet window is open within 30 seconds and its screenshot is recorded
    And the web bundle, rendered with the Tauri runtime present, shows the home route with the custom titlebar

  @negative-control
  Scenario: A copy with one changed byte is reported as a different bundle
    Given a scratch copy of "apps/web/dist" with one byte changed in one file
    When the bundle-identity check compares the scratch copy with "apps/web/dist"
    Then the check exits non-zero
    And it names the changed file in its output
