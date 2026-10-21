# Agent Quality Gates

> AGENTS.md §1.1(병합 권위)에서 추출한 집행 문서다. **규칙의 원천은 `AGENTS.md`**이며, 이 문서는 "무엇이 언제 집행되는가"의 사실을 담는다.

## 1. CI 필수 검사 (필수 검사 = `validate`)

`.github/workflows/validate.yml`이 정의한다.

- **트리거**: `pull_request`(base `main`) · `push`(브랜치 `main`) · `merge_group`(types `checks_requested`) · `workflow_dispatch`
- **권한**: `contents: read` (쓰기 권한 없음)
- **동시성**: group `validate-${{ github.ref }}`, `cancel-in-progress: true`
- **스텝 순서**(이 순서가 곧 필수 검사의 정의다):
  1. `pnpm exec biome check .` — 포맷·린트
  2. `pnpm run typecheck` — `tsc --noEmit`
  3. `pnpm run test` — `vitest run`
  4. `pnpm run build:github` — GitHub Pages 산출물 빌드
- **커버리지는 CI에서 실행되지 않는다.** (아래 §3 참조)

## 2. GitHub ruleset `main-protection`

ruleset id `25404151`, `enforcement: active`, 대상 ref은 `refs/heads/main`이다.

- **PR 병합 방법**: `squash`만 허용 (`allowed_merge_methods: ["squash"]`)
- **코드 소유자 리뷰**: `require_code_owner_review: true`
- **필수 상태 검사**: context `validate` (integration id `15368`), `strict_required_status_checks_policy: true`
- **금지 규칙**: `deletion`(브랜치 삭제 금지) · `non_fast_forward`(force push 금지)
- **기타**: `require_extra_approval_for_unattributed_changes: true`, `dismiss_stale_reviews_on_push: false`, `required_review_thread_resolution: false`
- `CODEOWNERS`는 소유자 리뷰의 대상 경로를 선언한다(§4).

## 3. 로컬 집행: `prek` 10훅 체인

`.pre-commit-config.yaml`이 정의한다. `pnpm exec prek run --all-files`로 전량 실행한다.

| # | 훅 | 소스 | 적용 범위 |
|---|---|---|---|
| 1 | `trailing-whitespace` | builtin | 전체 |
| 2 | `end-of-file-fixer` | builtin | 전체 |
| 3 | `check-yaml` | builtin | 전체 |
| 4 | `check-added-large-files` | builtin | 전체 |
| 5 | `biome-check` | `biomejs/pre-commit` v2.3.10 | 전체 |
| 6 | `typescript-typecheck` | local | `^src/` (`ts`, `tsx`) |
| 7 | `knip` | local | `^src/` (`ts`, `tsx`, `js`, `jsx`, `json`) |
| 8 | `dependency-cruiser` | local | `^src/` (`ts`, `tsx`, `js`, `jsx`) |
| 9 | `post-localization-sync` | local | `always_run` (`sync:post-localization:staged`) |
| 10 | `vitest-coverage` | local | `always_run` (`test:coverage`) |

- 모든 훅은 `pass_filenames: false`로 파일 목록을 인자 전달 대신 고정 스코프에 의존한다. 훅 6~8은 `^src/` 변경이 있을 때만 실행된다.
- **커버리지 실상**: 100% 임계치(`lines`/`functions`/`branches`/`statements`)는 `vite.config.ts`의 `test.coverage.include`에 선언된 `src/lib/utils.ts` · `src/lib/postLoader.ts` · `src/lib/markdown.ts` **3개 파일에만** 적용된다. 커버리지를 강제하는 실행 경로는 로컬 `vitest-coverage` 훅(10번)뿐이며, **CI는 커버리지를 측정하지 않는다.** 이 3개 파일의 커버리지가 100% 미만이면 `vitest-coverage` 훅이 실패하고 커밋이 차단된다.
- **절차 게이트 훅은 2026-10-19에 제거되었다.** 현재 `.pre-commit-config.yaml`에 procedure-gate 훅은 존재하지 않는다.

## 4. `CODEOWNERS` (통제 경로)

`.github/CODEOWNERS`가 선언한다. 모든 항목은 `@wintrover`다.

- **헌법·계약**: `/AGENTS.md` · `/docs/spec/` · `/docs/agents/`
- **실행 경로**: `/.github/workflows/` · `/.github/CODEOWNERS` · `/.pre-commit-config.yaml` · `/package.json` · `/vite.config.ts` · `/pnpm-lock.yaml`
- **발행·게이트 스크립트**: `/scripts/post-to-dev.ts` · `/scripts/procedure-gate.ts`
- **테스트·스킬**: `/tests/devto-publish-one.test.ts` · `/tests/legacy-publish-isolation.test.ts` · `/tests/agents-constitution.test.ts` · `/skills/`

## 5. 절차 게이트 은퇴 기록 (2026-10-19)

- **은퇴된 것**: `.github/workflows/procedure-gate.yml`(PR·push 트리거) 과 pre-commit의 procedure-gate 훅. 이제 존재하지 않는다 — 파일 부재는 계약 테스트(`tests/agents-constitution.test.ts`)가 고정한다.
- **남아 있는 것**: 게이트 로직 스크립트 `scripts/procedure-gate.ts` 와 그 순수 로직 테스트 `tests/procedure-gate.test.ts`. 변경 파일 계산은 three-dot diff를 기본으로 하고, 히스토리 재작성으로 merge base가 없을 때 two-dot diff로 폴백한다.
- **실행 경로**: 자동 집행 경로는 없다. 검증은 로컬 수동 실행(`pnpm run gate:procedure:staged`, `pnpm run gate:procedure:ci`)으로만 가능하다.
- **정책의 생존**: 증거 삼중항(`docs/spec/*.md` + `tests/features/*.feature` + `tests/**/*.test.ts`) 요구는 자동 차단에서 분리되어 **선언된 절차 정책**으로 유지된다. 현재 집행 표면의 정본은 이 문서 §1·§3·§5다.

## 6. 작업 완료 판정

- 모든 새로운 포스트나 코드 변경 사항은 최종적으로 `prek` 품질 게이트를 통과해야 한다.
- 완료의 정의는 기계 검증이다: 명령 → 관측 → pass/fail이 없으면 완료를 주장할 수 없다.
- 필수 검사(`validate`)와 오너 PR 승인이 모두 통과해야 병합된다.

## 관련

- [AGENTS.md §1.1](../../AGENTS.md) — 병합 권위(압축 버전)
- [docs/spec/](../../spec/) — 도메인 계약 정본(URL·빌드·UI·포스트 작성)
- [docs/agents/operations.md](operations.md) — 도구·환경 운영
