# Post creation standard - validates bilingual post requirements
# Updated: metric bar alignment, sidebar h4 padding, post content wording
Feature: Post creation standard

  Scenario: bilingual posts exist for new technical content
    Given a new technical blog post is created
    When the post is saved to the repository
    Then both English and Korean versions should exist with matching filenames
    And the English post should be in src/posts/project/ or src/posts/company/
    And the Korean post should be in src/posts/ko/project/ or src/posts/ko/company/

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
