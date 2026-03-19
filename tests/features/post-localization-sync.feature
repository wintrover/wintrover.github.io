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
