Feature: Devlog graph state and engine bridge
  As a Thought Trajectory Architect
  I want publishing logic to be engine-centric
  So that future interfaces can reuse immutable state and CLI contracts

  Scenario: state.json defines graph-oriented node and edge schema
    Given the repository tracks publishing state in root state.json
    When maintainers inspect the persisted structure
    Then nodes must include metadata for id path kind status and timestamps
    And edges must include from to relation and status
    And integrity fields must express dependency requirements

  Scenario: devlog CLI exposes sync publish and graph commands
    Given all business rules are encapsulated by Nim engine
    When operators execute devlog CLI
    Then the CLI should support "sync" for file-state reconciliation
    And the CLI should support "publish <id>" for idempotent publication gating
    And the CLI should support "graph" for visualization payload generation

  Scenario: publish requires dependency integrity before transition
    Given a node depends on prerequisite nodes
    When operators request publication for the node
    Then publication must be blocked when prerequisites are not published
    And publication must become idempotent once status is already published

  Scenario: publish uses secret-driven mocked platform delivery
    Given GitHub Actions injects platform secrets for publish
    When operators request publication for a draft node
    Then Nim engine must pass secret values through execution context
    And Nim engine must record mocked success responses per requested platform
    And state.json channels must be updated to published without real API calls

  Scenario: GitHub Actions persists engine state changes safely
    Given workflow_dispatch is used as temporary GUI
    When manual dispatch inputs a command and target node
    Then workflow must invoke Nim CLI instead of embedding business logic
    And execution summary must be rendered through GITHUB_STEP_SUMMARY
    And state.json changes must be committed and pushed to main automatically
    And commit message must include [skip ci] to prevent loop execution
