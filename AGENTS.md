---
name: blog-agent-operational-guide
description: 블로그 에이전트의 운영 페르소나, 도구 활용 및 작업 프로세스 가이드. 기술적 표준은 skills/ 디렉토리를 참조한다.
---

# AGENTS.md

이 파일은 AI 에이전트가 이 프로젝트(`wintrover-blog`)에서 효과적으로 작업할 수 있도록 가이드라인과 컨텍스트를 제공합니다.
블로그 오너의 공식 정체성은 **사고 궤적 아키텍트 (Thought Trajectory Architect)**이며, 핵심 역량은 단순 구현이 아니라 **복잡한 문제를 해결하기 위한 논리적 궤적을 설계하고 이를 AI와 협업해 물리적 코드로 이식하는 것**이다.

## 1. 에이전트 운영 및 도구 사용 규정

### 핵심 가동 지침

- **작업 시작 시 반드시 `CONTEXT.md`, BDD Gherkin(.feature), 테스트 코드를 전수조사한다.** 사용자의 지시를 받으면 구현에 앞서 이 세 가지 요소를 최우선으로 분석하여 현재 상태와 규칙을 완벽히 파악해야 한다.
- **UI 모션 관련 작업은 `CONTEXT.md`의 `[UI Motion Rule]`을 최우선으로 확인한다.** Svelte 컴포넌트 재사용으로 진입 모션이 소실되는 회귀를 절대 허용하지 않는다.
- **`skills/` 디렉토리를 탐색한다.** 현재 수행하려는 작업과 연관된 `SKILL.md`가 있다면 이를 즉시 로드하고 해당 체크리스트를 작업의 SSOT(Single Source of Truth)로 삼는다.
- 모든 기술적 의사결정 및 검증 절차는 개별 Skill 정의에 위임한다.
- **기능/코드 변경 작업은 아래 순서를 반드시(MUST) 선행하며, 완료 전 구현을 시작하면 안 된다.** `CONTEXT.md` 영향 여부 확인 및 필요 시 반영 → BDD 시나리오(.feature) 작성 → TDD 실패 테스트 작성 → 최소 구현 순서로 진행한다. 이 절차를 생략하면 작업을 중단하고 절차부터 복구한다.
- **아키텍트의 사고 궤적 보존 규칙**: 모든 변경 사항은 BDD와 TDD를 통해 의사결정의 논리적 증명을 완료하기 전까지 완료로 간주하지 않는다.
- **검증 단계에서 "버그가 없다"고 단정하기 전에 프레임워크 특성 기반 부작용 가설을 최소 3가지 수립·검증한다.** 특히 애니메이션 소실, 상태 유지/오염, 메모리 누수 관점을 필수로 포함한다.
- **포스팅 작성 시**: 항상 `post-creation-standard` 스킬을 최우선으로 준수하며, **모든 포스팅은 반드시 영어(English)로 작성한다.**
- **로깅 정책**: 앱 코드에서는 `src/lib/log.ts`의 `logError`/`logWarn`를 우선 사용한다.
- **타입 안정성**: 코드베이스에서 `any` 타입 사용을 엄격히 금지한다. 불가피한 경우 `unknown`을 사용하고 적절한 Type Guard를 구현한다.

### 도구 사용 강제

- **코드 탐색**: `code-index` MCP만 사용한다. (`mcp_code-index_*`)
- **공식 문서 탐색**: `Context7` CLI만 사용한다. (`ctx7` / `npx ctx7`)
- **사고 과정(구조적 문제해결)**: `Sequential Thinking` MCP만 사용한다. (`mcp_Sequential_Thinking_sequentialthinking`)
- **브라우저 로그/네트워크 확인**: `Chrome DevTools` MCP만 사용한다. (`mcp_Chrome_DevTools_MCP_*`)
- **GitHub Actions 확인**: `gh` 명령어만 사용한다. (예: `gh run list`, `gh run view`)
- **Git 명령어 페이저 비활성화**: 모든 git 명령어는 반드시 `git --no-pager <subcommand>` 형식으로 실행한다.

### 표준 언어 및 환경

- **최종 산출물/사용자 응대**: 한국어를 표준으로 한다.
- **개발 환경**: Windows PowerShell 환경에 최적화된 명령어를 사용한다.
- **패키지 및 실행 환경**:
  - 의존성 설치 및 관리가 중요한 작업(패키지 추가/삭제, CI 환경 등)은 반드시 `pnpm`을 사용한다.
  - 실행 속도가 중요한 작업(로컬 개발 서버 실행, 테스트 수행, 간단한 스크립트 실행)은 `bun`을 우선적으로 사용하여 생산성을 높인다.
- **테스트 설계**:
  - 신규/수정 테스트는 `fast-check` 기반 Property-Based Testing(PBT)을 기본으로 한다.
  - 사용자 시나리오/버그 재현은 Given-When-Then 형태의 BDD 스타일 테스트를 우선하며, UI 모션 시나리오는 **DOM 재렌더링/재생성 단위**까지 명시한다.
  - UI 모션 회귀 테스트는 데이터 변경 검증만으로 종료하지 않고, **DOM 참조 비교(`not.toBe`)**로 실제 컴포넌트 교체를 기계적으로 증명한다.
  - 테스트 커버리지는 회귀(regression) 방지의 최소 기준이며, 프로젝트의 커버리지 임계치를 지속적으로 만족해야 한다.

## 2. 작업 프로세스 및 스킬 매핑

에이전트는 다음 작업 단계별로 명시된 기술 스킬을 적용해야 한다.

- **포스트 작성 및 수정**: `skills/post-creation-standard`
- **시각화 자료(Mermaid) 처리**: `skills/mermaid-conversion`
- **외부 플랫폼(DEV.to) 배포**: `skills/devto-publishing`
- **품질 검증 및 테스트**: `skills/quality-assurance`

## 3. 주요 설정 및 명령어 (Quick Recap)

- **의존성 설치**: `pnpm install`
- **로컬 개발**: `bun run dev` (속도 최적화)
- **테스트**: `bun test` 또는 `bun x vitest` (속도 최적화)
- **품질 게이트 (prek)**: `bun x prek run --all-files` (Biome, 타입체크, Knip, DepCruise 병렬 검증)
- **빌드**: `pnpm build`
- **스크립트 실행**: `bun run <script_path>`
- **Context7 CLI 사용 절차**:
  - 라이브러리 해석: `ctx7 library <name> "<질문>"` 또는 `npx ctx7 library <name> "<질문>"`
  - 문서 조회: `ctx7 docs </org/project> "<질문>"` 또는 `npx ctx7 docs </org/project> "<질문>"`
  - 설치 확인: `ctx7 --version` (글로벌 설치 시)

## 4. 예외 및 품질 게이트

- 모든 새로운 포스트나 코드 변경 사항은 최종적으로 `skills/quality-assurance` 내의 `prek` 품질 게이트를 통과해야 한다.
  - 특히, **테스트 커버리지가 100% 미만인 경우 `prek`를 통과할 수 없으며 커밋이 차단된다.**
