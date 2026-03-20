Feature: Post localization synchronization

  Scenario: localized copies keep aligned narrative intent
    Given a Korean and English post share the same slug
    When one localized body is revised for narrative emphasis
    Then the paired localized body should preserve the same core claims and closing intent

  Scenario: Korean post detail keeps stable Korean line composition
    Given I render a Korean post detail page
    When the markdown content wraps in a constrained container
    Then Korean text should avoid arbitrary per-character breaks while preserving overflow safety

  Scenario: scalar tags in localized front matter remain visible tags
    Given a localized post front matter defines tags as a scalar string
    When the post is loaded into the detail page
    Then the scalar tag should be normalized and rendered as a visible tag chip

  Scenario: paired posts keep matching dashed section delimiters
    Given a Korean and English post share the same slug
    When readability separators are added with dashed hr lines
    Then both localized copies should keep identical upper and lower delimiter boundaries

  Scenario: localized rewrite preserves paragraph nuance and rhetorical tone
    Given a Korean source post is refined for stronger narrative emphasis
    When the paired English post is updated to match the same slug
    Then the English copy should preserve the Korean paragraph flow and intensity of core claims
    And the formal verification section should preserve probabilistic-limit arguments and numeric claims

  Scenario: partial edit keeps markdown readability markers and fixed phrases
    Given I partially edit an existing localized post
    When the section structure and protected lines are reviewed
    Then dashed hr separators and heading hierarchy should remain unchanged
    And trailing backslashes and protected verification phrases should be preserved verbatim
    And readability-driven sentence splits should keep original core claims intact

  Scenario: partial edit keeps flow-block layout and numbered verification procedure
    Given I refine readability in a localized post section
    When I review thought-flow and formal-verification paragraphs
    Then flow lines with arrow connectors should preserve blank lines and trailing backslashes
    And formal verification steps should remain an ordered numbered list
    And the verification example may add an explicit counterexample branch before the final rejection line

  Scenario: KO change auto patches EN section with nuance-locked structure
    Given a Korean post and English post share the same slug
    When Korean formal-verification anchors are present
    Then the EN formal-verification section should be patched automatically
    And the counterexample branch lines and trailing backslashes should be preserved
