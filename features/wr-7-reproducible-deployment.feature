# Contract WR-7. Owner tasks: wr01-release-scenarios/1.1, wr07-container-images/7.3,
# wr08-cluster-manifests/8.1, wr01-release-scenarios/1.6, wr08-cluster-manifests/8.5,
# wr08-cluster-manifests/8.6, wr09-release-boundary/9.4.
# Oracle: the Argo CD application is Synced and Healthy at a commit of this repository, and the
# running image digests equal the digests the workflow pushed for the tag pinned in that commit.
# Negative control: a manifest pinned to a tag that does not exist must leave the application not
# Healthy.
# Fixtures: image tags are immutable commit SHAs.
# Not a Playwright scenario. Production entry: `argocd app get know-meet --output json`, compared with
# the image digests recorded by the build workflow (wr09 task 9.4, lead session). The comparison tool
# is tooling/release/src/verify-cluster.ts or a successor named by wr08 task 8.5.
@WR-7 @value-critical @release @boundary-only @command @cluster
Feature: WR-7 The deployment is reproducible from the repo
  As the operator
  I need the running release to be exactly what this repository and its workflow produced
  So that a deployment can be explained, repeated and rolled back from Git

  Scenario: Argo CD runs the images the workflow pushed for the pinned tag
    Given the production overlay pins both images to one commit SHA of this repository
    And the build workflow recorded the digests it pushed for that tag
    When the Argo CD application "know-meet" is read as JSON
    Then its sync status is "Synced" and its health status is "Healthy"
    And its synced revision is a commit of this repository
    And the image digests of the running pods equal the digests the workflow recorded for the pinned tag
    And the Argo CD status, the workflow run URL and the digest pairs are recorded as evidence

  @negative-control
  Scenario: A tag that does not exist leaves the application not Healthy
    Given a scratch overlay pinned to an image tag that the registry does not have
    When Argo CD syncs the scratch overlay
    Then the application health status is not "Healthy"
