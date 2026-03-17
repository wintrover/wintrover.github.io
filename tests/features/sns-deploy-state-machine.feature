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

  Scenario: action summary and status snapshot are persisted
    Given all platform attempts complete
    When workflow finishes
    Then GITHUB_STEP_SUMMARY must include a markdown result table
    And repository root STATUS.md must visualize post by platform status
    And .deploy and STATUS.md changes must be committed and pushed together
