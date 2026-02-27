---
name: quality-assurance
description: 블로그 포스트 및 코드의 품질을 보장하기 위한 최종 검증 절차.
---

## When to Use

- 작업 완료 후 사용자에게 최종 보고하기 전
- 커밋 또는 배포 직전

## Rules

- **통합 품질 게이트 (prek)**: `bun x prek run --all-files`를 실행하여 다음 항목들을 병렬로 검증한다.
  - **Biome**: 린트 및 포매팅 체크
  - **타입 체크**: TypeScript 타입 안정성 검사
  - **Knip**: 사용되지 않는 코드 및 의존성 탐색
  - **Dependency Cruiser**: 종속성 규칙 및 그래프 유효성 검사
- **체크리스트 수행**: `unified-template.md` 하단에 정의된 작성 완료 체크리스트를 100% 충족해야 한다.
- **빌드 확인**: `pnpm build`를 통해 빌드 오류가 발생하지 않는지 확인한다.

## Checklist

- [ ] 린트 에러나 경고가 모두 해결되었는가?
- [ ] 템플릿의 '검증 체크리스트' 항목을 모두 체크했는가?
- [ ] `npm run build` 결과물에 문제가 없는가?
