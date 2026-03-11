---
name: change-validation
description: 코드 변경 시 품질 게이트를 수행하고 변경 무결성을 검증하는 절차.
---

## When to Use

- 기능 추가/버그 수정/리팩터링 등 코드 변경이 있는 모든 작업

## Workflow

### 0) MCP 도구 사용 (필수)

- 모든 탐색 및 사고 과정에서 `AGENTS.md`에 정의된 MCP 도구(`code-index`, `Context7`, `Sequential Thinking`)를 강제로 사용한다.

### 1) 품질 게이트 (필수)

- **정적 분석/타입체크**: `npm run check`
- **테스트 및 검증**: `npm run test:run` (단위, 통합, BDD 포함)
- **돌연변이 테스트**: `npm run test:mutation` (Stryker, Mutation Score 100% 목표)
- **프로덕션 빌드**: `npm run build`
- **Required Outcome**
  - `npm run check`, `npm run test:run`, `npm run build`가 모두 성공해야 함
  - 모든 단위/통합 테스트와 BDD 시나리오가 통과해야 함
  - 빌드 산출물은 `build/` 디렉터리에 생성되어야 함(GitHub Pages 업로드 경로)

### 2) 변경 단위 정리 (필수)

- 변경 사항이 하나의 목적을 갖도록 논리적 단위로 정리한다.
- 변경이 SOLID/SSOT/DRY/SoC 원칙을 훼손하지 않는지 점검한다.
- 커밋이 필요하면 `git-atomic-commit`을 따른다(사용자 요청/승인 시).

## Completion Criteria

- 품질 게이트가 모두 통과
- 변경 내용이 논리적으로 정리됨
