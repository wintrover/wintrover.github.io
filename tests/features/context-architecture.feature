Feature: Context SSoT architecture and UI invariants
  As a maintainer
  I want architecture and layout rules to be executable
  So that core constraints are preserved over time

  Scenario: URL architecture uses root for English and /ko for Korean
    Given the project SSoT defines URL architecture
    When build and locale rules are evaluated
    Then English routes must be rooted at "/"
    And Korean routes must use "/ko/"
    And "/en/" routes must not be generated as canonical architecture

  Scenario: Blog list layout keeps vertical flow and equal card size
    Given the blog list component is rendered in list mode
    When card content length varies
    Then the list must stay vertically aligned
    And each card must keep a consistent size

  Scenario: All list routes reuse one post list UI source
    Given root category and tag list pages exist
    When each route renders post cards
    Then they must share the same post list component
    And route pages should only compose filters and sections

  Scenario: Build and Mermaid pipelines keep critical invariants
    Given build-github.ts and image-tools.ts are part of release flow
    When pipeline safety checks are executed
    Then build-github.ts must keep required dist entrypoints
    And image-tools.ts must preserve Mermaid extract-render-replace fallback flow
