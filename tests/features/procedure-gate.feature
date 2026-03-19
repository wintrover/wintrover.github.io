Feature: AGENTS 절차 게이트 강제
  As a Thought Trajectory Architect
  I want process rules to fail automatically when missing
  So that Context-BDD-TDD-Implementation order stays enforceable

  Scenario: implementation change requires context bdd and test evidence
    Given a change includes implementation files
    When staged or CI diff is evaluated
    Then CONTEXT.md must be included in changed files
    And at least one tests/features/*.feature file must be included
    And at least one tests/**/*.test.ts file must be included

  Scenario: documentation-only change should not be blocked
    Given a change includes only markdown documentation
    When gate evaluates changed files
    Then gate result must pass without requiring implementation evidence

  Scenario: CI gate must run on pull_request and push
    Given GitHub workflow is configured for procedure gate
    When maintainers open PR or push to main
    Then workflow must execute gate script and fail on violation

  Scenario: rewritten history in CI must still produce changed file list
    Given branch history can be force-rewritten without a merge base
    When CI computes changed files for procedure gate
    Then gate must fallback from three-dot to two-dot diff

  Scenario: context7 proxy must preserve downstream framing compatibility
    Given MCP client can send either Content-Length or NDJSON requests
    When context7 toolname proxy receives initialize and tools/list
    Then proxy must parse both framing styles without timeout
    And proxy responses must follow detected downstream framing

  Scenario: runtime scripts must avoid js extension leftovers
    Given repository enforces TypeScript-first runtime scripts
    When gate checks critical script and config paths
    Then context7 proxy path must be scripts/context7-toolname-proxy.ts
    And dependency cruiser config must be JSON based
