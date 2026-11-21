# Contract WC-11. Owner tasks: wc01-conferencing-scenarios/1.5, wc01-conferencing-scenarios/1.1,
# wc08-entity-graph-5-0-1/8.1 to 8.5, wc11-conferencing-boundary/11.2.
# Oracle: the lockfile resolves entity-graph-core and -react to 5.0.1 with npm integrity hashes in
# all three packages (apps/web and both agentic-ui spikes); tooling/versions.toml says 5.0.1; the
# notes create-and-list flow passes.
# Negative control: pnpm lint:pins fails if any package still pins 4.x or 5.0.0. The same pin checks
# used by the spec are run on a synthetic lockfile at 4.3.0 and 5.0.0 and must flag it.
# Commands in the boundary packet: pnpm why @prometheus-ags/entity-graph-core (apps/web and both
# spikes), pnpm lint:pins.
# Executed by tests/release/wc-11-entity-graph.spec.ts. The notes flow runs against the default build
# (the hosted build excludes /notes) with only the /api/notes BFF stubbed in memory.
@WC-11 @value-critical @release @boundary-only @command @packaged
Feature: WC-11 Entity graph 5.0.1 from npm, and notes still work
  As a maintainer of the web app and the spikes
  I need one entity graph version from the npm registry everywhere
  So that the shared store behaves the same in all three and notes keep working

  Scenario: Every importer resolves 5.0.1 with a registry integrity hash
    When the lockfile and tooling/versions.toml are read
    Then apps/web, spikes/agentic-ui/own and spikes/agentic-ui/hybrid pin core and react at 5.0.1
    And the resolved packages carry sha512 integrity hashes from the npm registry
    And tooling/versions.toml says 5.0.1
    And "pnpm why @prometheus-ags/entity-graph-core" in each of the three packages reports 5.0.1

  @negative-control
  Scenario: The pin checks flag 4.3.0 and 5.0.0
    Given a synthetic lockfile at 4.3.0 and another at 5.0.0
    Then the pin checks report problems for both and none for 5.0.1
    And "pnpm lint:pins" exits non-zero when any package still pins 4.x or 5.0.0

  @packaged-only
  Scenario: Notes can still be created and listed
    Given the default web build is served and the notes endpoint answers from memory
    When the guest saves a note on the notes screen
    Then the note appears in the saved list
