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

- **적용 규칙 (2026-10-22 실측)**: `deletion`(브랜치 삭제 금지) · `non_fast_forward`(force push 금지) · `required_status_checks`(context `validate`, integration id `15368`, `strict_required_status_checks_policy: true`) — 총 3개.
- **`pull_request` 규칙 제거 (2026-10-22 무리뷰 전환)**: "Require a pull request before merging" 규칙을 전체 제거했다. 인간 승인·코드 소유자 리뷰는 병합 요건이 아니며, PR 필수 자체도 ruleset이 더 이상 강제하지 않는다. main 직접 push는 `required_status_checks`가 ref 갱신에 `validate` 통과를 요구하므로 검증 우회는 여전히 차단된다.
- **병합 방법**: ruleset 수준 제한이 없다. 자동화 경로는 `gh pr merge --auto --squash`로 squash를 관례로 사용한다.
- **저장소 설정 `allow_auto_merge: true`**: 병합 요건이 충족되면 GitHub가 PR을 자동 병합한다. PR별 auto-merge는 write 권한 보유자(App 포함)가 설정한다.
- **우회 주체(`bypass_actors`)**: 오너(User, `pull_request` 모드) **전용**이다. 자동화 App `wintrover-automation`은 의도적으로 등록되지 않았다 — 이 App은 ruleset 변경·워크플로 파일 push·규칙 우회 병합을 수행할 수 없다.
- `CODEOWNERS`는 리뷰 요청 대상 경로를 선언한다(§4). 병합 게이트가 아니다.

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
- **발행·게이트 스크립트**: `/scripts/post-to-dev.ts` · `/scripts/procedure-gate.ts` · `/scripts/app-token.ts`
- **테스트·스킬**: `/tests/devto-publish-one.test.ts` · `/tests/legacy-publish-isolation.test.ts` · `/tests/agents-constitution.test.ts` · `/skills/`

## 5. 절차 게이트 은퇴 기록 (2026-10-19)

- **은퇴된 것**: `.github/workflows/procedure-gate.yml`(PR·push 트리거) 과 pre-commit의 procedure-gate 훅. 이제 존재하지 않는다 — 파일 부재는 계약 테스트(`tests/agents-constitution.test.ts`)가 고정한다.
- **남아 있는 것**: 게이트 로직 스크립트 `scripts/procedure-gate.ts` 와 그 순수 로직 테스트 `tests/procedure-gate.test.ts`. 변경 파일 계산은 three-dot diff를 기본으로 하고, 히스토리 재작성으로 merge base가 없을 때 two-dot diff로 폴백한다.
- **실행 경로**: 자동 집행 경로는 없다. 검증은 로컬 수동 실행(`pnpm run gate:procedure:staged`, `pnpm run gate:procedure:ci`)으로만 가능하다.
- **정책의 생존**: 증거 삼중항(`docs/spec/*.md` + `tests/features/*.feature` + `tests/**/*.test.ts`) 요구는 자동 차단에서 분리되어 **선언된 절차 정책**으로 유지된다. 현재 집행 표면의 정본은 이 문서 §1·§3·§5다.

## 6. 작업 완료 판정

- 모든 새로운 포스트나 코드 변경 사항은 최종적으로 `prek` 품질 게이트를 통과해야 한다.
- 완료의 정의는 기계 검증이다: 명령 → 관측 → pass/fail이 없으면 완료를 주장할 수 없다.
- 필수 검사(`validate`)가 통과하면 auto-merge가 병합한다(인간 승인 없음).

## 7. 잔류 위험 (기록)

- **Pages 배포는 `main` push로 독립적으로 트리거된다.** `pages-deploy.yml`은 ruleset과 무관하게 `main`에 도달한 커밋을 배포하므로, ruleset은 **유일한 병합 게이트**다. 오너가 규칙 우회로 검증에 실패한(red) 커밋을 `main`에 올리면 그 커밋은 그대로 배포된다. 기록된 잔류 위험이며 본 슬라이스에서 해결하지 않는다.
- **무리뷰 수용 한계**: 검증 명령 정의(`package.json`)·의존성 잠금(`pnpm-lock.yaml`)·테스트 코드·빌드 설정·발행 스크립트·CODEOWNERS 선언은 PR 작성자가 변경할 수 있다. 필수 CI가 통과해도 검증 체인과 발행 로직의 의미 보존까지는 보증되지 않는다. 오너 전용 경계는 플랫폼 권한 영역(ruleset·저장소 설정·워크플로 파일·secrets·environments)이다.
- **PR 필수 규칙 제거의 잔류 위험**: main 직접 push가 ruleset 수준에서 차단되지 않는다. 남은 방어선은 `required_status_checks`(strict)가 ref 갱신에 `validate` 통과를 요구하는 것뿐이며, 병합 방법 제한(squash 전용)도 사라졌다 — squash는 자동화 경로의 관례로만 유지된다.

## 관련

- [AGENTS.md §1.1](../../AGENTS.md) — 병합 권위(압축 버전)
- [docs/spec/](../../spec/) — 도메인 계약 정본(URL·빌드·UI·포스트 작성)
- [docs/agents/operations.md](operations.md) — 도구·환경 운영
