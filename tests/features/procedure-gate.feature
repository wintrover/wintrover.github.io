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
