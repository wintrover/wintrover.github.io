# Post creation standard - validates bilingual post requirements
# Updated: metric bar alignment, sidebar h4 padding, post content wording, mission statement, next series teaser
Feature: Post creation standard

  Scenario: bilingual posts exist for new technical content
    Given a new technical blog post is created
    When the post is saved to the repository
    Then both English and Korean versions should exist with matching filenames
    And the English post should be in src/posts/project/, src/posts/company/, or src/posts/archright/
    And the Korean post should be in src/posts/ko/project/, src/posts/ko/company/, or src/posts/ko/archright/

  Scenario: frontmatter contains required fields
    Given a new blog post is created
    When the post frontmatter is defined
    Then it should contain layout field set to "post"
    And it should contain a clear and engaging title
    And it should contain a valid date in YYYY-MM-DD HH:MM:SS -0000 format
    And it should contain at least 3 tags
    And it should contain category as "Project" or "Company Work"
    And it should contain a 1-2 sentence description

  Scenario: project naming follows convention
    Given a blog post about Axiom project
    When the post content references the project name
    Then it should use "Axiom" consistently
    And it should not use "Axiom Enterprise" as the project name

  Scenario: bilingual content matches in structure
    Given English and Korean versions of the same post
    When comparing both versions
    Then both should have matching section headers
    And both should preserve the same core claims
    And both should have matching frontmatter fields except language-specific content

  Scenario: Axiom tag enforces Archright category
    Given a blog post contains the Axiom tag
    When the post is loaded by the postLoader
    Then its category must be Archright
    And if the frontmatter or folder assigned a different category
    Then the loader automatically overrides it to Archright
    And a warning is logged for the mismatch

  Scenario: Archright posts carry exactly one Axiom subtopic tag
    Given an Archright blog post is created
    When the post frontmatter tags are defined
    Then it should contain the Axiom tag
    And it should contain exactly one of "Axiom for External Repos" or "Axiom logs"

  Scenario: Axiom for External Repos posts follow the repo-first format
    Given a blog post is tagged with "Axiom for External Repos"
    When the post frontmatter and body are written
    Then the title should start with the verified repository name followed by a colon
    And the first section heading should be "References" in English or "자료" in Korean
    And the references section should appear at the top of the body
    And the text should not use emphasis words such as "real", "actually", "genuine", or "decisive"
