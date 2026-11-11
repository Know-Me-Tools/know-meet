# Contract VS-5. Owner tasks: c03/3.3, c06/6.2, c13/13.5.
# Oracle: the home route renders with zero console errors and no Tauri API calls outside isTauri()
# guards. Detection: a page-side trap on window.__TAURI_INTERNALS__ records every read; a guarded
# call never reads it in a plain browser.
# Negative control: an unguarded Tauri import injected in a scratch branch must produce a blank
# page or console error that the smoke detects.
@VS-5 @value-critical @ui @web @smoke @boundary-only
Feature: VS-5 Plain web build works without the Tauri runtime
  As a Know Meet user in a browser
  I need the web app to work without the desktop runtime
  So that sharing one bundle with the desktop never breaks the web

  Scenario: The home route renders cleanly in a plain browser
    Given the production web build is served by Vite preview
    When a browser without the Tauri runtime opens the home route
    Then the home route's main landmark and app bar are visible
    And no console error or uncaught page error was logged
    And no code read the Tauri runtime globals
    And the console log and a screenshot are recorded as evidence

  @negative-control
  Scenario: An unguarded Tauri call is detected
    Given a scratch branch whose web entry calls the Tauri invoke API at startup without an isTauri() guard
    And the scratch build is served by Vite preview
    When a browser without the Tauri runtime opens the home route
    Then the smoke reports a Tauri global read, a console error or a blank page
