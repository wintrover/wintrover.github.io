Feature: SNS deployment state machine
  As a Thought Trajectory Architect
  I want GitHub Actions and Git filesystem to preserve deploy state
  So that publishing remains idempotent and observable across reruns

  Scenario: soft lock prevents duplicate execution
    Given deployment workflow starts with filesystem state checks
    When .deploy/lock already exists
    Then the workflow must stop before publishing APIs are called

  Scenario: per-platform state file decides retry and skip behavior
    Given each post tracks platform state in .deploy/<postKey>/<platform>.status
    When .success marker exists
    Then deployment for that platform must be skipped
    And when .failed marker exists or no state file exists
    Then deployment for that platform must be attempted

  Scenario: platform APIs are called with required identity and absolute image URLs
    Given deployment script posts to LinkedIn and Dev.to directly
    When LinkedIn request body is created
    Then posting endpoint must use rest/posts with Posts API payload schema
    And workflow_dispatch linkedin_dry_run=true must skip LinkedIn publish API call and print preview payload
    And author must use person URN resolved from v2/me and continue with fallback urn:li:person:binfyrHJAK when profile lookup fails
    And LinkedIn commentary intro must be English-only
    And LinkedIn commentary must place canonical link in a separate paragraph with one blank line
    And markdown image paths must be converted to absolute https://wintrover.github.io/ URLs

  Scenario: action persists deploy state to isolated DB branch
    Given workflow triggers on push to deploy branch and supports workflow_dispatch
    And workflow checks out deploy source and DB state branches separately
    When deployment script completes with STATE_DATA_ROOT path
    Then GITHUB_STEP_SUMMARY must include a markdown result table
    And database/STATUS.md must visualize post by platform status
    And DB branch must commit and push .deploy and STATUS.md only
    And if DB branch does not exist, workflow must bootstrap it as orphan branch

  Scenario: state persistence push handles conflict with bounded rebase retries
    Given DB branch may advance during workflow execution
    When state push fails on first attempt
    Then workflow must run git pull --rebase and retry push up to 3 times

  Scenario: deploy target discovery is isolated to physical files under src/posts
    Given deployment script requires an explicit target path
    When target path is provided explicitly
    And workflow is triggered by push event without manual inputs
    Then only one existing .md file under src/posts may enter deployment
    And ko locale subtree under src/posts must be excluded from deployment candidates
    And directory target must be rejected immediately
    And paths outside src/posts must be rejected
    And canonical slug for deployment URL must follow app slugify behavior for apostrophes
    And GITHUB_STEP_SUMMARY must include scanned root and candidate file snapshot
    And terminal logs must include scanned root and candidate file snapshot

  Scenario: preflight and publish are separated with environment approval
    Given workflow computes candidate file count before publish
    When candidate file count is greater than MAX_PUBLISH_PER_RUN
    Then workflow must hard fail before publish step
    And preflight summary must include scanned root and candidate snapshot
    And publish job must run only after environment approval
    And workflow must trigger failure notification when preflight or publish fails
    And bulk backfill must run only in a dedicated manual workflow with batch limit
