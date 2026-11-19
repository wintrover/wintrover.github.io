Feature: Reproducible production acceptance
  As a maintainer
  I want the deployed site checked against the same contract every time
  So that a post-deploy regression is reported as an exact failing check

  Scenario: Production HTTP contract holds for landings, aliases, sitemap, and forbidden paths
    Given the production site is deployed at https://wintrover.github.io
    When the tool probes the HTTP surface for every slug derived from collectPostEntries
    Then each KO landing must return 200 with the exact canonical and hash redirect
    And each EN landing must return 200
    And the roots must return the expected status and html lang
    And /kr must redirect to /kr/ and /ko must redirect to /ko/
    And the sitemap must contain exactly 62 locs with no /kr or legacy alias entries
    And forbidden KO paths must return 404 while their root counterparts return 200
    And an unknown path must return 404

  Scenario: Korean posts are observed through real browser requests
    Given the production Korean tree is deployed
    When the tool visits every KO post landing in a real browser
    Then the final hash must be #/post/<slug> with html lang=ko and a Korean h1
    And no same-origin /ko/ response may have status >= 400
    And no same-origin request may fail
    And no .markdown-content image may have naturalWidth 0
    And asset correctness must be observed from browser requests rather than deriveKoPublicAssets

  Scenario: SPA head SEO is an opt-in flag until the head fix deploys
    Given the production SPA still emits a stale document title and two canonical links
    When the tool runs with default flags
    Then the spa-seo check must be skipped and the run must still pass
    And when the tool runs with --include-spa-seo
    Then each post page must have exactly one canonical equal to its post URL
    And document.title must equal the post title
