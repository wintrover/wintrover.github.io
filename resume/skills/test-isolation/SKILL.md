---
name: test-isolation
description: 테스트를 도입할 때, 실행 순서/환경에 독립적인 테스트 격리 원칙을 적용하는 체크리스트.
---

## Rules

- 테스트는 실행 순서/병렬 실행/재시도에 영향을 받지 않아야 한다.
- 테스트는 외부 상태(파일 시스템, 네트워크, 시간, 랜덤)에 의존하지 않도록 구성한다.
- UI 문자열/경로 로직은 배포 환경을 고려한다(예: `$app/paths`의 `base`).

## Placement

- 기본적으로 테스트는 대상 코드와 가깝게 둔다(예: `src/lib/utils/*.test.ts`).
- 프레임워크 의존이 큰 테스트(라우팅/페이지 렌더링)는 최소화하고, 순수 로직을 `src/lib/utils`로 분리해 검증한다.

## Completion Criteria

- 테스트가 다른 테스트 실행 순서/병렬 워커에 영향을 받지 않음
- 로컬 실행 환경에서 안정적으로 재현 및 통과
- 실패 원인이 환경 노이즈가 아니라 도메인 규칙 위반으로 해석 가능

## Property-Based Testing (Optional)

### Tools

- **TypeScript/JavaScript**: [fast-check](https://fast-check.dev/)

### Guidelines

- `fc.assert(fc.property(...))`를 기본으로 사용하며, 테스트 러너(Jest, Vitest 등)와 결합한다.
- `fc.record`, `fc.array`, `fc.integer` 등 빌트인 Arbitrary를 조합하여 복잡한 모델을 정의한다.
- `.map`을 사용할 때는 실패 케이스 축소(Shrink)를 위해 `unmapper` 제공을 고려한다.
- 테스트 러너/fast-check는 저장소 기본 의존성이 아니므로, 필요 시 최소 범위로만 도입한다.

## BDD (Behavior Driven Development)

### Rules

- **Gherkin 시나리오**: `src/bdd/features/*.feature` 파일에 인간이 읽을 수 있는 언어로 시나리오를 작성한다.
- **테스트 통합**: `src/bdd/gherkin.test.js`와 연동하여 Vitest 환경에서 시나리오를 검증한다.
- **관심사**: 개별 기능의 기술적 검증뿐 아니라 사용자 시점의 행위적 명세를 유지한다.

## Mutation Testing (Required)

### Notes

- 이 저장소는 Stryker를 기반으로 병렬 돌연변이 테스트를 수행한다.
- **Mutation Score 100%** 달성을 목표로 하며, 생존(survived) 돌연변이가 발생하면 테스트를 보강하거나 설계를 개선해야 한다.
- 실행 명령어: `npm run test:mutation`

### Completion Criteria

- 모든 돌연변이가 사멸(killed)되거나 적절히 처리되어 Mutation Score 100% 달성
- 실행 중 에러가 없고 리포트가 정상 생성됨
