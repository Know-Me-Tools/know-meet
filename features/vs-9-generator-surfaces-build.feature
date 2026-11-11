# Contract VS-9 (classification: packaging). Owner tasks: c05/5.4, c05/5.6, c13/13.7.
# Oracle: workspace checks and the BFF builds with zero errors; FRB bindings regenerate without diff.
# Negative control: removing a crate from the workspace makes cargo check fail.
@VS-9 @cli @rust @boundary-only
Feature: VS-9 Kept generator surfaces build: Rust core, flutter_rust_bridge, Axum BFF
  As a Know Meet maintainer
  I need every kept generator surface to build from a clean target directory
  So that nothing imported in c05 is dead weight

  Background:
    Given a clean cargo target directory for this run

  @smoke
  Scenario: The Rust workspace checks and the BFF builds
    When "cargo check --workspace" runs at the repository root
    Then the command exits 0 with no error diagnostics
    When "cargo build -p bff" runs at the repository root
    Then the command exits 0 with no error diagnostics

  Scenario: flutter_rust_bridge bindings regenerate without a diff
    When the flutter_rust_bridge codegen runs with the repository's configuration
    Then the command exits 0
    And the generated binding files are byte-identical to the committed ones

  @negative-control
  Scenario: Removing a crate from the workspace breaks the check
    Given a scratch copy of the repository with one member crate removed from the workspace that another member depends on
    When "cargo check --workspace" runs in the scratch copy
    Then the command exits non-zero
