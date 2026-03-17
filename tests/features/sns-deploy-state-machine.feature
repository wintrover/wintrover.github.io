Feature: SNS deployment state machine
  As a Thought Trajectory Architect
  I want GitHub Actions and Git filesystem to preserve deploy state
  So that publishing remains idempotent and observable across reruns

  Scenario: soft lock prevents duplicate execution
    Given deployment workflow starts with filesystem state checks
    When .deploy/lock already exists
    Then the workflow must stop before publishing APIs are called

  Scenario: per-platform state file decides retry and skip behavior
    Given each post tracks platform state in .deploy/<slug>/<platform>.status
    When .success marker exists
    Then deployment for that platform must be skipped
    And when .failed marker exists or no state file exists
    Then deployment for that platform must be attempted

  Scenario: platform APIs are called with required identity and absolute image URLs
    Given deployment script posts to LinkedIn and Dev.to directly
    When LinkedIn request body is created
    Then author must use LINKEDIN_PERSON_URN with fallback urn:li:person:binfyrHJAK
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
