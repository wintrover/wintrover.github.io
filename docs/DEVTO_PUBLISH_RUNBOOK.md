# DEV.to Publish Runbook

Repeatable, minimal steps to publish a post to DEV.to and avoid broken images.

## Prerequisites
- Environment variables (do not commit secrets):
  - `DEVTO_API_KEY` (required)
  - `BLOG_PUBLIC_BASE_URL` (example: `https://wintrover.github.io/blog`)
- Images must be publicly accessible via absolute HTTPS URLs under `/blog/assets/...`.

## Checklist (run in order)
1) Run tests
```
npm run test
```

2) Stage & commit (English message), then push
```
git add .
git commit -m "fix(devto): normalize image URLs and tests"
git push
```

3) Publish the target markdown to DEV.to
```
node scripts/post-to-dev.js src/posts/<target-file>.md
```
Example:
```
node scripts/post-to-dev.js src/posts/2025-09-23-11.md
```
The command prints a draft URL like:
```
Successfully created draft: https://dev.to/<your-handle>/<slug>-temp-slug-<id>
```

4) Manual verification (optional, PowerShell)
- Check the DEV.to dynamic image URL returns 200 OK.
```
Invoke-WebRequest -Uri "https://media2.dev.to/dynamic/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fwintrover.github.io%2Fblog%2Fassets%2Fimages%2F<PATH>" -Method Head -UseBasicParsing
```
- Expect `StatusCode : 200` and `Access-Control-Allow-Origin: *`.

## Notes & Pitfalls
- All image URLs in markdown must be absolute and include the `/blog` base, e.g. `https://wintrover.github.io/blog/assets/images/...`.
- Relative paths like `/assets/...`, `assets/...`, `../assets/...` are auto-normalized to `/blog/assets/...` by the pipeline.
- If an image still breaks on DEV.to:
  - The remote URL might be unreachable (404), hotlink blocked, or wrong content-type.
  - Verify the source URL opens directly in a browser.

## Quick command recipe
- Test → Commit → Push → Publish
```
npm run test && git add . && git commit -m "fix(devto): update post" && git push && node scripts/post-to-dev.js src/posts/<target-file>.md
```
