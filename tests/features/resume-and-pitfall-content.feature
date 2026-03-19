Feature: Resume link and pitfall post cleanup
  As a blog maintainer
  I want public content links and endings to stay clean
  So that resume navigation and post quality remain consistent

  Scenario: resume social linkedin uses canonical profile URL
    Given resume social links are defined in site config
    When linkedin link is rendered
    Then linkedin URL must use https://www.linkedin.com/in/<slug>/ format

  Scenario: pitfall post excludes authoring process checklist text
    Given pitfall post content is published for readers
    When the article reaches the ending section
    Then authoring process checklist headings must not remain in body text

  Scenario: resume meta title uses unified short label
    Given resume locale metadata is configured for both Korean and English
    When title fields are resolved for runtime and build fallback
    Then meta title and og title should use "resume" consistently
