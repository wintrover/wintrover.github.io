Feature: Public URL contract is the append-only alias authority
  As a maintainer
  I want published URLs to live in one append-only registry
  So that renames never break existing links and build output matches the registry

  Rule: url-contract.json is the single authority for canonical and alias URLs

  Scenario: Canonical URL registry matches derived public URLs
    Given the public URL contract is committed with canonical entries
    When the build derives canonical URLs from fixed routes and post entries
    Then the registry canonical set must equal the derived canonical set
    And every alias must resolve to a final canonical URL

  Scenario: New canonical URL may be appended for a new post
    Given a registry without the new post URL
    When a post is added and the registry is updated
    Then the new canonical URL may be appended
    And no existing entry may be removed or retargeted

  Scenario: Renaming a post converts its canonical URL into an alias
    Given a published canonical URL for a post
    When that post slug is renamed in the same locale
    Then the registry may keep the old URL as an alias targeting the new canonical
    And the alias document must canonicalize to the final published URL

  Scenario: Removing a published canonical URL fails the append-only gate
    Given the base revision registry contains a canonical URL
    When the head revision deletes that URL
    Then the append-only diff must report the URL as removed
    And the gate must fail with a non-zero exit

  Scenario: Retargeting an existing alias fails the append-only gate
    Given the base revision registry maps an alias to a target
    When the head revision points that alias at a different target
    Then the append-only diff must report a retarget violation
    And converting the alias back into a canonical URL must also fail

  Scenario: Alias chains resolve to the final canonical URL
    Given a registry with alias A targeting alias B and alias B targeting canonical C
    When the build generates alias pages
    Then alias A must canonicalize and redirect to C
    And alias B must canonicalize and redirect to C
    And a cyclic alias chain must fail the build

  Scenario: Bootstrap accepts the first registry only when it matches derived URLs
    Given the base revision has no url-contract.json
    When the append-only gate evaluates the head registry
    Then the gate must pass only when the head registry equals the derived canonical set
    And it must fail when canonical URLs are missing or stale

  Scenario: Locale aliases stay out of the sitemap
    Given the registry declares the legacy /kr/ locale alias
    When the sitemap and alias documents are generated
    Then the sitemap must contain only canonical URLs
    And the /kr/ document must canonicalize to /ko/ with a zero-second refresh
    And every alias document must declare robots noindex,follow

  Scenario: One guarantee register bounds the public contract claims
    Given the public contract guarantee register
    When a reader asks what the published URL contract guarantees
    Then guaranteed, not guaranteed, and unknown decisions must be separated
    And CI must not be claimed as the production acceptance witness
