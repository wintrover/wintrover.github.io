Feature: Context SSoT architecture and UI invariants
  As a maintainer
  I want architecture and layout rules to be executable
  So that core constraints are preserved over time

  Rule: CONTEXT 문서는 프로젝트의 단일 규칙 원천이어야 한다

  Scenario: CONTEXT 문서가 핵심 헌법 규칙을 포함한다
    Given project governance is driven by CONTEXT.md
    When maintainers review architecture constraints
    Then the document must define SSoT policy
    And it must define URL architecture and locale constraints
    And it must define build and Mermaid pipeline constraints
    And it must define PostFeed single-source UI constraints

  Scenario: URL architecture uses root for English and /ko for Korean
    Given the project SSoT defines URL architecture
    When build and locale rules are evaluated
    Then English routes must be rooted at "/"
    And Korean routes must use "/ko/"
    And "/en/" routes must not be generated as canonical architecture

  Scenario: Locale detection must not treat /en as locale path
    Given runtime locale is inferred from pathname and browser language
    When pathname starts with "/en/"
    Then locale parser must not resolve it as explicit locale
    And fallback resolution should rely on browser language or default locale

  Scenario: Canonical SEO path must follow locale prefix policy
    Given a post detail page is rendered
    When locale is English
    Then canonical URL must be generated without "/ko" prefix
    When locale is Korean
    Then canonical URL must be generated with "/ko" prefix

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

  Scenario: Post detail page keeps Geist dark visual language
    Given the application uses Geist-style dark tokens globally
    When a post detail page is rendered
    Then the page should avoid legacy GitHub accent colors
    And badges buttons and code blocks should use zinc-based neutral palette
    And title and body typography should keep density aligned with list UI
    And list and detail should share vertical rhythm scale tokens

  Scenario: Build output verification enforces deployment entrypoints
    Given GitHub Pages build output is generated
    When verification is executed
    Then dist must include root and /ko entrypoints
    And dist must include root and /ko resume entrypoints
    And verification must fail fast with non-zero exit on missing files

  Scenario: Sitemap generation preserves locale architecture
    Given sitemap is generated from post metadata
    When URL entries are assembled
    Then Korean posts must use "/ko/post/{slug}/"
    And English posts must use "/post/{slug}/"
    And no canonical "/en/" post URL should be emitted

  Scenario: Build and Mermaid pipelines keep critical invariants
    Given build-github.ts and image-tools.ts are part of release flow
    When pipeline safety checks are executed
    Then build-github.ts must keep required dist entrypoints
    And image-tools.ts must preserve Mermaid extract-render-replace fallback flow

  Scenario: Mermaid image naming and fallback handling remain deterministic
    Given markdown contains Mermaid code blocks
    When diagrams are transformed to static images
    Then image filenames must follow stable numbering convention
    And conversion failure must keep Mermaid source in warning fallback
    And CI wrapper must fail with non-zero exit on generation error
