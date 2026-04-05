Feature: Pitfall post content cleanup
  As a blog maintainer
  I want reader-facing pitfall posts to exclude authoring artifacts
  So that published content stays clean

  Scenario: pitfall post excludes authoring process checklist text
    Given pitfall post content is published for readers
    When the article reaches the ending section
    Then authoring process checklist headings must not remain in body text
