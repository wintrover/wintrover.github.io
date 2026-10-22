# Agent Operations

> AGENTS.md §3(환경)에서 추출한 절차 문서다. **규칙의 원천은 `AGENTS.md`**이며, 이 문서는 "어떻게 실행하는가"만 담는다.

## 도구 사용 강제

- **코드 탐색**: `code-index` MCP만 사용한다. (`mcp_code-index_*`)
- **공식 문서 탐색**: `Context7` CLI만 사용한다. (`ctx7` / `npx ctx7`)
- **사고 과정(구조적 문제해결)**: `Sequential Thinking` MCP만 사용한다. (`mcp_Sequential_Thinking_sequentialthinking`)
- **브라우저 로그/네트워크 확인**: `Chrome DevTools` MCP만 사용한다. (`mcp_Chrome_DevTools_MCP_*`)
- **GitHub Actions 확인**: `gh` 명령어만 사용한다. (예: `gh run list`, `gh run view`)
- **Git 명령어 페이저 비활성화**: 모든 git 명령어는 반드시 `git --no-pager <subcommand>` 형식으로 실행한다.

## 로깅 정책

- 앱 코드에서는 `src/lib/log.ts`의 `logError`/`logWarn`를 우선 사용한다.
- `console.error` 직접 호출을 남기지 않는다. (`src/lib/log.ts`가 유일한 예외 경로다)

## 타입 안정성

- 코드베이스에서 `any` 타입 사용을 엄격히 금지한다. 불가피한 경우 `unknown`을 사용하고 적절한 Type Guard를 구현한다.
- **실태 주석**: 현재 `biome.json`의 `suspicious.noExplicitAny`는 `off`다. 즉 lint가 `any`를 기계적으로 잡아주지 않는다. 위 금인은 **자동 게이트가 아니라 규율**이며, `any`가 필요해질 때는 `unknown` + Type Guard가 기본값이다.

## 자격 증명

- 자동화 작업은 `GH_TOKEN`으로 수행한다. 토큰은 `pnpm exec tsx scripts/app-token.ts`가 **표준출력 한 줄**로 내며 유효 기간은 1시간이다. 401을 만나면 토큰을 다시 민팅한다.
- **fail-closed 셸 스니펫**:

  ```sh
  set -eu
  T="$(pnpm exec tsx scripts/app-token.ts)" || exit 1
  test -n "$T" || exit 1
  export GH_TOKEN="$T"
  ```

- **개인키는 저장소 밖에 있다.** 기본 위치는 `~/.config/wintrover-automation/`(`WINTROVER_APP_CONFIG` 환경 변수로 변경 가능)이며, `app.pem`(권한 `0600`)과 `config.json`(`appId` · `installationId`)을 담는다. 저장소 안에는 절대 두지 않는다.
- **키 소지 ≠ 토큰 보유.** 키는 서버 측에서 폐기될 때까지 토큰을 계속 민팅한다. 키 파일이 유출되면 설치 토큰이 무한 재생성되므로 키 파일 자체를 보호한다.
- **`GH_TOKEN` 없이 git 쓰기 명령을 실행하지 않는다.** `gh`의 credential helper가 저장된 오너 자격 증명을 조용히 대신 쓰기 때문에, "토큰 미설정"이 "오너 권한으로 실행"이 된다. 쓰기 명령 전에 `GH_TOKEN` 설정 여부를 확인한다. 자동화의 자격 증명은 App 설치 토큰뿐이다.
- **`sns-publish` 환경 승인은 브라우저에서 수행한다.** `GH_TOKEN`이 설정된 상태의 `gh` 리뷰는 App 신원으로 기록되므로 환경 승인을 대신하지 않는다. PR 병합 자체는 승인 리뷰 없이 auto-merge로 수행된다.

## 표준 언어 및 환경

- **최종 산출물/사용자 응대**: 한국어를 표준으로 한다.
- **커밋 메시지**: 영어로 작성한다.
- **개발 환경**: Windows PowerShell 환경에 최적화된 명령어를 사용한다. 저장소의 스크립트(`pnpm`/`bun`/`tsx`)는 셸 불변이므로 POSIX 셸에서도 그대로 동작한다.

## 패키지 및 실행 환경

- **의존성 설치 및 관리가 중요한 작업**(패키지 추가/삭제, CI 환경 등)은 반드시 `pnpm`을 사용한다.
- **실행 속도가 중요한 작업**(로컬 개발 서버 실행, 테스트 수행, 간단한 스크립트 실행)은 `bun`을 우선적으로 사용하여 생산성을 높인다.

## 주요 명령어

- **의존성 설치**: `pnpm install`
- **로컬 개발**: `bun run dev` (속도 최적화)
- **테스트**: `bun x vitest` (속도 최적화). `bun test`는 bun 자체 테스트 러너라 vitest 스펙과 호환되지 않으므로, 이 저장소에서는 `pnpm run test`(`vitest run`)를 사용한다.
- **품질 게이트 (prek)**: `bun x prek run --all-files` (Biome, 타입체크, Knip, DepCruise 병렬 검증)
- **빌드**: `pnpm build`
- **스크립트 실행**: `bun run <script_path>`
- **Context7 CLI 사용 절차**:
  - 라이브러리 해석: `ctx7 library <name> "<질문>"` 또는 `npx ctx7 library <name> "<질문>"`
  - 문서 조회: `ctx7 docs </org/project> "<질문>"` 또는 `npx ctx7 docs </org/project> "<질문>"`
  - 설치 확인: `ctx7 --version` (글로벌 설치 시)

## 관련

- [AGENTS.md §3](../../AGENTS.md) — 환경 요약(압축 버전)
- [docs/agents/task-process.md](task-process.md) — 작업 절차
- [docs/agents/quality-gates.md](quality-gates.md) — 집행 체인
