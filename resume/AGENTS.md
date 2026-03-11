---
name: wintrover-portfolio-agent-guide
description: SvelteKit 정적 포트폴리오 프로젝트의 작업 원칙, 도구 활용, 검증 절차 가이드. 기술 표준은 skills/ 디렉토리를 참조한다.
---

## 1. 프로젝트 구조(SSOT)

- SvelteKit + `@sveltejs/adapter-static` 기반의 정적 사이트이며 GitHub Pages로 배포한다.
- 핵심 디렉터리
  - `src/routes/`: 페이지/라우팅(조합 중심)
  - `src/lib/components/`: 재사용 UI 컴포넌트
  - `src/lib/i18n/`: 다국어 리소스 및 초기화
  - `src/lib/utils/`: 프레임워크 비의존 유틸/로직
  - `static/`: 정적 자산(이미지, 404, favicon 등)

## 2. 핵심 작업 원칙

- 작업 시작 시 `skills/` 디렉터리에서 관련 SKILL.md를 확인하고 체크리스트를 따른다.
- SOLID(SRP/OCP/LSP/ISP/DIP), SSOT, DRY, SoC를 동시에 만족하도록 변경 범위를 설계한다.
- 관심사 분리(SoC)를 유지한다.
  - 라우트(`src/routes`)는 페이지 구성/데이터 연결에 집중한다.
  - 재사용 컴포넌트/로직은 `src/lib` 하위로 이동한다.
  - 번역 문자열은 `src/lib/i18n/locales/*`에만 둔다.
- 하드코딩을 피한다.
  - 링크/텍스트는 i18n 리소스 또는 단일 위치(SSOT)로 모은다.
  - 배포 경로는 `svelte.config.js`의 `kit.paths.base` 규칙을 따른다.
- SSOT 기준 파일
  - UI 문자열: `src/lib/i18n/locales/*`
  - 공통 링크/메타/콘텐츠 ID: `src/lib/utils/site.js`

### 도구 사용 강제

- **에이전트는 모든 작업 과정에서 지정된 MCP 도구 사용을 강제한다.**
- 코드 탐색은 code-index MCP만 사용한다. (`mcp_code-index_*`)
- 공식 문서 탐색은 Context7 MCP만 사용한다. (`mcp_context7_*`)
- 사고 과정(구조적 문제해결)은 Sequential Thinking MCP만 사용한다. (`mcp_Sequential_Thinking_sequentialthinking`)
- 브라우저 로그/네트워크 확인은 Chrome DevTools MCP만 사용한다. (`mcp_Chrome_DevTools_MCP_*`)

### 표준 언어 및 환경

- 최종 산출물/사용자 응대는 한국어를 표준으로 한다.
- Git 커밋 메시지 관례를 따르며, Windows PowerShell 환경에 최적화된 명령어를 사용한다.
- Node.js 18(이상)을 기준으로 한다(배포 워크플로우와 동일).
- 패키지 매니저는 `package-lock.json` 기준으로 npm을 사용한다.

## 3. 품질 게이트(필수)

- 로컬 검증 기본 순서
  - `npm run check` (Biome, Typecheck, Knip, Dependency Cruiser)
  - `npm run test:run` (단위/통합 테스트 + BDD 시나리오 검증)
  - `npm run build`
- 테스트 및 품질 기준
  - **테스트 커버리지**: 100% 유지 (Vitest)
  - **돌연변이 테스트**: Stryker 기반 Mutation Score 100% 달성
  - **BDD(Gherkin)**: `src/bdd/features/*.feature` 시나리오와 테스트 코드의 통합 연동 필수
- 배포 워크플로우 기준
  - 의존성 설치: `npm ci`
  - 빌드 산출물: `build/`

## 4. 작업 프로세스 및 스킬 매핑

에이전트는 다음 작업 단계별로 명시된 기술 스킬을 적용해야 한다.

- **설계 및 아키텍처**: `skills/architecture-principles`
- **로깅 및 예외 처리**: `skills/logging-policy`
- **코드 품질 및 변경 검증**: `skills/change-validation`
- **테스트(도입 시)**: `skills/test-isolation`
- **Git 작업**: `skills/git-atomic-commit`

## 5. 예외 및 검증 원칙

- 모든 변경 사항은 최종적으로 `skills/change-validation`에 정의된 품질 게이트를 통과해야 한다.
