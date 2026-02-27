---
name: blog-agent-operational-guide
description: 블로그 에이전트의 운영 페르소나, 도구 활용 및 작업 프로세스 가이드. 기술적 표준은 skills/ 디렉토리를 참조한다.
---

# AGENTS.md

이 파일은 AI 에이전트가 이 프로젝트(`wintrover-blog`)에서 효과적으로 작업할 수 있도록 가이드라인과 컨텍스트를 제공합니다.

## 1. 에이전트 운영 및 도구 사용 규정

### 핵심 가동 지침

- **작업 시작 시 반드시 `skills/` 디렉토리를 탐색한다.** 현재 수행하려는 작업과 연관된 `SKILL.md`가 있다면 이를 즉시 로드하고 해당 체크리스트를 작업의 SSOT(Single Source of Truth)로 삼는다.
- 모든 기술적 의사결정 및 검증 절차는 개별 Skill 정의에 위임한다.
- **포스팅 작성 시**: 항상 `post-creation-standard` 스킬을 최우선으로 준수하며, **모든 포스팅은 반드시 영어(English)로 작성한다.**

### 도구 사용 강제

- **코드 탐색**: `code-index` MCP만 사용한다. (`mcp_code-index_*`)
- **공식 문서 탐색**: `Context7` MCP만 사용한다. (`mcp_context7_*`)
- **사고 과정(구조적 문제해결)**: `Sequential Thinking` MCP만 사용한다. (`mcp_Sequential_Thinking_sequentialthinking`)
- **브라우저 로그/네트워크 확인**: `Chrome DevTools` MCP만 사용한다. (`mcp_Chrome_DevTools_MCP_*`)

### 표준 언어 및 환경

- **최종 산출물/사용자 응대**: 한국어를 표준으로 한다.
- **개발 환경**: Windows PowerShell 환경에 최적화된 명령어를 사용한다.
- **패키지 및 실행 환경**:
  - 의존성 관리 및 패키지 설치는 `pnpm`을 사용한다.
  - 실행 속도가 중요한 작업(개발 서버, 테스트, 스크립트 실행)은 `bun`을 우선적으로 사용한다.

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

## 4. 예외 및 품질 게이트

- 모든 새로운 포스트나 코드 변경 사항은 최종적으로 `skills/quality-assurance` 내의 `prek` 품질 게이트를 통과해야 한다.
- `src/templates/unified-template.md`의 체크리스트를 통과하지 못한 포스트는 완료로 간주하지 않는다.
