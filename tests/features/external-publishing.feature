Feature: External publishing body preparation
  As the blog owner
  I want the DEV.to draft body to carry only absolute site URLs and to re-sync on re-run
  So that evidence links resolve on dev.to and content fixes reach the existing draft

  Rule: Site-internal references must be absolute in the exported draft body

  Scenario: Root-relative evidence links are absolutized against the public base URL
    Given a post body containing a markdown link to /evidence/p0d2g/README.md
    When the post is prepared for DEV.to publication
    Then the link target must become https://wintrover.github.io/evidence/p0d2g/README.md
    And no markdown link target starting with a single / may remain in the prepared body

  Scenario: Anchors, absolute URLs, protocol-relative URLs and document-relative links are untouched
    Given a post body containing links to #section, https://example.com/x, //example.com/x, ./local.md and ../up/local.md
    When the post is prepared for DEV.to publication
    Then every one of those link targets must remain exactly as written

  Scenario: Image references keep their existing absolute URL conversion
    Given a post body containing a markdown image and an HTML img with site-relative src
    When the post is prepared for DEV.to publication
    Then both image sources must be absolute URLs under the public base URL

  Rule: Re-running Draft One re-syncs the existing draft

  Scenario: An existing draft is refreshed by PUT on the same article id
    Given an existing DEV.to draft matching the post canonical URL
    When Draft One runs again for the same post
    Then the draft must be updated via PUT on the same article id
    And the PUT payload must keep published false and carry the absolutized body markdown
    And no new POST request may be made
    And the run must end with state draft_verified, observed draft true and observed published false

  Scenario: A 5xx draft refresh failure ends unknown without automatic retry writes
    Given an existing DEV.to draft matching the post canonical URL
    And the draft refresh PUT responding with 5xx
    When Draft One runs again for the same post
    Then the run must end with state unknown
    And no automatic retry POST or PUT may follow
