Feature: SPA head identity
  As a search engine or reader
  I want each SPA route to own exactly one canonical link and the correct title
  So that the rendered document never advertises the loading state or a stale route

  Scenario: Post route converges to one canonical and the post title
    Given the static shell provides one canonical link
    When the SPA renders a post route after the post data has resolved
    Then the document must contain exactly one canonical link
    And the canonical must be the locale post URL
    And the document title must be the post title

  Scenario: Home and resume routes reset head identity
    Given a post route previously set its title and canonical
    When the SPA renders the home route
    Then the title must be the locale blog title and the canonical must be the locale root
    When the SPA renders the resume route
    Then the title must be the locale resume title and the canonical must be the resume URL

  Scenario: Unknown route falls back to the locale root
    Given a post route previously set its title and canonical
    When the SPA renders an unknown route
    Then the title must be the locale NotFound title
    And the canonical must be the locale root
    And no post structured data may remain in the document head

  Scenario: Route transitions keep a single canonical owner
    Given the SPA starts on the home route
    When the route changes to post, home, resume, and an unknown route in order
    Then every observed document must have exactly one canonical link
    And the title and canonical value must update for each route
    And no stale duplicate canonical or structured data may remain

  Scenario: Category and tag views canonicalize to the locale root
    Given the SPA is on a hash route for a category or tag view
    When the view applies its head identity
    Then the canonical must be the locale root without a fragment
    And the title and description must keep the category or tag labels
