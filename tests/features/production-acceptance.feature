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
    And the sitemap loc multiset must equal the expectation without missing, unexpected, or duplicate entries
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

  Scenario: SPA head SEO is an opt-in flag
    Given the production SPA emits a single canonical and a route-specific document title
    When the tool runs with default flags
    Then the spa-seo check must be skipped and the run must still pass
    And when the tool runs with --include-spa-seo
    Then each post page must have exactly one canonical equal to its post URL
    And document.title must equal the post title

  Scenario: Sitemap expectation follows url-contract.json when present
    Given the repository root may contain url-contract.json with canonical URLs and aliases
    When the tool compares the production sitemap loc multiset with the expectation
    Then the expectation must come from url-contract.json when present, then dist/sitemap.xml, then source post entries
    And each canonical URL must be compared root-relative with no missing, unexpected, or duplicate entries
    And every alias URL from the contract or the legacy registry must be absent
    And the 62 loc total must not decide pass or fail

  Scenario: Legacy /kr and unknown paths are judged stage by stage
    Given the production alias and 404 documents are deployed
    When the tool inspects each hop with redirects disabled
    Then /kr must answer 301 with Location /kr/
    And /kr/ must answer 200 with exact refresh 0; url=/ko/, canonical /ko/, and robots noindex
    And /ko/ must answer 200 rather than another HTTP 301
    And an unknown path must answer its own 404 with no Location header and no canonical
    And the browser must land on a same-origin hash URL whose final document responds 200
    And the SPA not-found DOM must be judged as a separate check from the response and navigation stages

  Scenario: SPA head SEO covers category and tag routes
    Given a category and a tag exist in source frontmatter
    When the tool runs with --include-spa-seo
    Then the category and tag hash routes must render a title containing the category label
    And each route must have exactly one canonical equal to its locale root without a hash
    And the hashless category path must not be accepted as a canonical
