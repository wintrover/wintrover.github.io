# Project Rules

## Commit and Quality Gate
- 절대 `git commit --no-verify`를 사용하지 않는다.
- 커밋 전 반드시 아래 순서로 실행하고 모두 통과한 뒤 커밋한다.
  - `npm run test -- tests/sns-deploy-state-machine.test.ts` (해당 작업과 직접 관련된 테스트)
  - `npm run lint`
  - `npm run typecheck`

## Deploy Workflow Verification
- deploy 브랜치 변경 후 `SNS Deploy State Machine` 실행 결과를 확인한다.
- `.deploy/<slug>/devto.status`, `.deploy/<slug>/linkedin.status`, `STATUS.md`를 DB 브랜치에서 검증한다.
