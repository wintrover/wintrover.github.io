Feature: Post localization synchronization

  Scenario: localized copies keep aligned narrative intent
    Given a Korean and English post share the same slug
    When one localized body is revised for narrative emphasis
    Then the paired localized body should preserve the same core claims and closing intent
