Feature: Legacy publish path isolation
  As a maintainer
  I want every publish path to share one approval and credential boundary
  So that no retired workflow can create or expose an external post

  Rule: Retired publish workflows must not exist on the default branch

  Scenario: Legacy publish and bridge workflows are removed
    Given the default branch contains the publish workflow catalog
    When the catalog is inspected
    Then sns-deploy, sns-bulk-backfill and devlog-bridge workflows must be absent
    And no workflow may push commits directly to main

  Scenario: Only approved draft workflows can read the DEV.to credential
    Given workflows declare the DEVTO_API_KEY secret
    When the secret references are enumerated
    Then only publish-one and unpublish-one may reference it
    And both must run behind the sns-publish environment

  Scenario: Legacy CLI requires explicit opt-in
    Given PUBLISH_LEGACY_ENABLED is unset
    When the legacy deployment entrypoint is invoked
    Then it must throw a disabled error before any network call
