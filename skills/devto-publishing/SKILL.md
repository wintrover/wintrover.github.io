---
name: devto-publishing
description: 블로그 포스트를 DEV.to 초안으로 안전하게 생성하고 외부 관측으로 검증하는 절차.
---

## When to Use

- 블로그 포스트 작성이 완료되어 DEV.to에 **초안**을 만들 준비가 되었을 때
- 기존 초안의 상태를 재검증하거나 재실행 no-op을 확인할 때

## Rules

- **초안 전용**: `Draft One`은 `published:false` 초안만 만든다. 공개 전환은 이 저장소의 자동화 범위가 아니다. 이미 공개된 글을 초안으로 되돌릴 때는 `Unpublish One`을 사용한다.
- **단일 실행 경로**: 발행은 `.github/workflows/publish-one.yml`의 `repository_dispatch: draft-one`으로만 요청한다. 로컬에서 `scripts/post-to-dev.ts`를 직접 실행하지 않는다. `--publish-one` 외의 레거시 경로는 `PUBLISH_LEGACY_ENABLED` 없이는 거부된다.
- **승인 경계**: 실제 실행은 `sns-publish` 환경의 오너 승인을 통과해야 한다. 에이전트는 승인자가 될 수 없다.
- **감독 모드 (App 등록 전)**: 현재 에이전트는 오너의 관리자 토큰으로 동작하므로, dispatch와 승인은 오너가 지켜보는 상태에서만 수행한다. App 토큰으로 교체된 뒤 이 임시 조항을 제거한다.
- **사전 검증**: 발행 전 `pnpm run typecheck`, `pnpm run test`, `pnpm run build:github`가 통과해야 한다.
- **외부 관측이 유일한 증거**: 성공 판정은 `GET https://dev.to/api/articles/me/all`에서 동일 `id`가 `published:false`로 보이는 것이다. 워크플로 로그의 success나 로컬 마커는 증거가 아니다.
- **재실행**: 동일 포스트를 다시 요청하면 기존 초안을 찾아 `already_draft`/`draft_found`로 종료해야 하며 새 POST를 만들면 안 된다.
- **불명 상태**: `unknown`은 성공이 아니다. 자동 재POST하지 말고 `/me/all`을 다시 조회해 동일 canonical/title의 글을 찾은 뒤 판정한다.
- **이미지 주소**: 본문 이미지는 공개 절대 URL(`https://wintrover.github.io/assets/images/...`)이어야 한다. `/blog` 접두사는 사용하지 않는다.
- **비밀 정보**: `DEVTO_API_KEY`의 목표 권위는 `sns-publish` 환경 secret이다. 오너 이전 전까지는 저장소 secret이 임시로 사용되며, 코드·로그에 값을 남기지 않는다.
- **GitHub Actions 확인**: `gh` 명령어만 사용한다. (예: `gh run list`, `gh run view`)
- **Git 명령어 페이저 비활성화**: 모든 git 명령어는 반드시 `git --no-pager <subcommand>` 형식으로 실행한다.
- **공식 문서 탐색**: Context7은 MCP가 아닌 CLI(`ctx7` 또는 `npx ctx7`)만 사용한다.

## Checklist

- [ ] `validate` 필수 검사와 오너 PR 승인이 통과했는가?
- [ ] `Draft One` 실행이 `sns-publish` 환경 승인 대기에서 멈췄는가?
- [ ] 승인 후 artifact의 `state`가 `draft_verified`/`draft_found`/`already_draft`인가?
- [ ] `observedDraft=true`, `observedPublished=false`인가?
- [ ] 공개 API `GET /api/articles/{id}`가 404인가?
- [ ] 재실행 시 동일 `id`를 찾고 신규 POST가 0건인가?
- [ ] 실패 주입(`post_response_loss`) 시 자동 재POST 없이 `unknown`으로 끝나는가?
