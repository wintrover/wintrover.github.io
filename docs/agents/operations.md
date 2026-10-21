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
