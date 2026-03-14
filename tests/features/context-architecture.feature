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

  Scenario: Brand metadata should be derived from one shared source
    Given blog and build pipelines use SEO metadata
    When identity strings are changed
    Then runtime SEO defaults and build-time env defaults should share one source
    And duplicated hardcoded branding literals should be avoided in build scripts

  Scenario: Blog list canonical URL must not emit /en fallback
    Given blog list metadata is generated outside browser runtime
    When locale is English
    Then canonical URL must be rooted at "/" without "/en/" prefix

  Scenario: Blog list layout keeps vertical flow and equal card size
    Given the blog list component is rendered in list mode
    When card content length varies
    Then the list must stay vertically aligned
    And each card must keep a consistent size

  Scenario: Mobile app content fits viewport width without horizontal overflow
    Given the app shell is rendered on a mobile viewport
    When the main content container uses full width
    Then the content box sizing should include horizontal padding in width calculation
    And flex-based main content should allow shrinking with min-width zero
    And the page should avoid extending beyond viewport width

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
    And post detail meta should place tags before published date
    And post detail header should not render category badge

  Scenario: Post detail markdown should not overflow mobile viewport
    Given a post detail page renders markdown body on mobile viewport
    When long code blocks or wide tables are present
    Then markdown containers should keep width within parent content area
    And wide elements should use horizontal scrolling inside themselves

  Scenario: Post route hero motion must replay on route entry
    Given hero motion uses route-level entry animation
    When navigation enters "/post/{slug}" from another route
    Then hero container should be recreated instead of reused
    And hero entry motion should be replayed on the recreated DOM

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

  Scenario: Transient post loading failures must be retryable
    Given post loading can fail intermittently
    When the same slug is requested again after a failure
    Then post detail loading should retry fetch for that slug
    And posts store loading should retry after previous failure
