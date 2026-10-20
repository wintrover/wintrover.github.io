# DEV.to Draft Runbook

Repeatable, minimal steps to create **one draft** on DEV.to, verify it externally, and prove re-runs do not duplicate it.

## Prerequisites

- `DEVTO_API_KEY` exists only as a `sns-publish` environment secret.
- The `Draft One` workflow is the only write path; it is triggered by `repository_dispatch` (`draft-one`).
- The owner is the required reviewer for the `sns-publish` environment.
- Images are publicly reachable at absolute URLs under `https://wintrover.github.io/assets/images/...`.

## Checklist (run in order)

1) Validate `main`
```
gh run list --workflow validate --limit 5
```
Expected: the latest `main` run is `success`.

2) Dispatch one draft from the automation identity
```
gh api -X POST repos/wintrover/wintrover.github.io/dispatches \
  -f event_type=draft-one \
  -F client_payload[post_path]=src/posts/<target-file>.md \
  -F client_payload[platform]=devto \
  -F client_payload[dry_run]=false \
  -F client_payload[confirm]=DRAFT \
  -F client_payload[fail_injection]=none
```
Expected: `204`. `post_path` must be a single `.md` under `src/posts/` and must not be under `src/posts/ko/`.

3) Confirm the run is waiting for owner approval
```
gh run list --workflow=publish-one.yml --limit 1 \
  --json databaseId,event,actor,headBranch,status
```
Expected: `event=repository_dispatch`, `actor=<automation-app>`, `headBranch=main`, `status=waiting`.

4) Approve the environment deployment (owner only)
```
RUN_ID=<run-id>
gh api repos/wintrover/wintrover.github.io/actions/runs/$RUN_ID/pending_deployments
gh api -X POST repos/wintrover/wintrover.github.io/actions/runs/$RUN_ID/pending_deployments \
  --input - <<'JSON'
{"environment_ids":[<environment-id>],"state":"approved","comment":"owner-approved draft-only dispatch"}
JSON
gh run watch "$RUN_ID" --exit-status
```
Expected: the job starts only after approval.

5) Verify the external result — this is the only success evidence
```
gh run download "$RUN_ID" -n publish-result -D /tmp/devto-draft
cat /tmp/devto-draft/publish-result.json
```
Expected:
```
state: draft_verified | draft_found | already_draft
observedDraft: true
observedPublished: false
```
Then:
```
curl -s -o /dev/null -w "%{http_code}\n" https://dev.to/api/articles/<id>
```
Expected: `404` (a draft has no public article endpoint).

Authenticated check: use `Unpublish One` with `article_id=<id>`; expected `action=already_draft`, `published:false`.

6) Re-run without local state
Delete any local artifact and dispatch the same post again. Expected: the same `id` is found, `state=already_draft`, and no new POST is made.

7) Failure injection
```
-F client_payload[fail_injection]=post_response_loss
```
Expected: the workflow fails with `unknown`; no automatic re-POST follows. Reconcile by listing `/me/all` and matching canonical/title.

## Notes & Pitfalls

- `published:true` is never produced by `Draft One`. If an article is already public, the run fails with `published_exists` and requires `Unpublish One` first.
- `client_payload` is untrusted free-form JSON. The workflow validates an allowlist and never interpolates payload into a shell.
- Do not use `.js` paths or `node scripts/post-to-dev.js`; the runtime entrypoint is `scripts/post-to-dev.ts` via `pnpm exec tsx`.
- Do not treat a green job or a local marker as proof. Only the DEV.to API observation counts.
