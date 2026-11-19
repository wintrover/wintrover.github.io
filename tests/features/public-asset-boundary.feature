Feature: Locale public asset boundary
  As a maintainer
  I want the Korean output tree to contain only the assets the Korean site consumes
  So that English-only public documents never leak into /ko/

  Rule: Korean public assets are derived from content, not copied

  Scenario: Korean build copies only derived public assets
    Given the Korean build runs with COPY_PUBLIC_DIR set to false
    When the build completes
    Then dist/ko/images must equal the derived Korean asset set
    And images/profile.png must always be included

  Scenario: Forbidden public documents never appear in the Korean tree
    Given the Korean output tree is inspected
    When evidence, 404.html, .nojekyll, auto-merge-verification.txt, kr, sitemap.xml or robots.txt exists under dist/ko
    Then the build must fail closed

  Scenario: Post directory sets match collected locale slugs
    Given the build output is verified after the sitemap step
    When dist/ko/post and dist/post directory sets are compared with collected slugs
    Then the Korean tree must contain only Korean slugs
    And the English tree may additionally contain legacy alias slugs
