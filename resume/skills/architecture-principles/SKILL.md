---
name: architecture-principles
description: SvelteKit 프로젝트에서 SoC/DRY/SSOT 중심으로 구조를 유지하는 체크리스트.
---

## When to Use

- 모듈 구조 변경, 책임 분리, 설정/환경 처리 변경, 도메인 로직 추가 등 설계 영향이 있는 작업

## Checklist

- **MCP 도구 강제**: 코드 탐색(code-index), 문서 조회(Context7), 사고 과정(Sequential Thinking) 시 반드시 지정된 MCP 도구를 사용하는가
- SOLID: 변경으로 인해 SRP/OCP/LSP/ISP/DIP 위반이 생기지 않는가
- 단일 책임: 변경 이유가 1개인가
- 관심사 분리: 페이지 조합/컴포넌트/유틸/번역 리소스가 섞이지 않는가
  - 라우트(`src/routes`)는 페이지 구성과 데이터 연결에 집중하는가
  - 재사용 컴포넌트는 `src/lib/components`로 모였는가
  - 프레임워크 비의존 로직은 `src/lib/utils`로 분리됐는가
  - UI 문자열은 `src/lib/i18n/locales/*`에만 존재하는가
- DRY: 중복 구현이 생기지 않았는가
- SSOT: 설정/상수/콘텐츠 ID가 중앙화되어 있는가 (`src/lib/utils/site.js` 등)
- 하드코딩 금지: 임시 값/더미 데이터가 남지 않았는가
- GitHub Pages 경로: 정적 자산/링크는 `$app/paths`의 `base`를 고려하는가
- 안정성 우선: 실패 모드/예외 처리/재시도 정책이 명확한가
