# 자동화 신원 계약

> 이 문서는 자동화 신원(GitHub App)과 설치 토큰 발급 계약의 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> 병합 권위와 집행 체인은 [quality-gates.md](../agents/quality-gates.md)에, 자격 증명 운영 절차는 [operations.md](../agents/operations.md)에 있다.

## 신원

- 자동화 신원은 GitHub App `wintrover-automation`이며, 하나의 설치(installation)로 이 저장소 하나만 대상으로 한다.
- 권한은 `contents:write` · `pull_requests:write` · `checks:read` · `actions:read` 네 가지로 한정된다.
- `administration` · `workflows` · `organization` 권한은 부여되지 않는다. 이 App은 ruleset 변경, 워크플로 파일 push, 저장소 설정 변경을 수행할 수 없다.
- App은 ruleset의 우회 주체(`bypass_actors`)로 등록되지 않는다. 우회 주체는 오너(User, `pull_request` 모드) 전용이다.
- App 신원으로 작성한 PR의 저자 자체는 승인이 필요하지 않다. 승인 신원은 오너(다른 신원)여야 한다.

## 설치 토큰 발급 계약

- 발급은 `scripts/app-token.ts`가 수행한다. `POST /app/installations/{installationId}/access_tokens` 호출에 저장소 하향 스코프(`repositories: ["wintrover.github.io"]`)를 명시한다.
- App JWT는 RS256 서명이다. `iss`는 App ID이며, `iat`는 현재 시각 - 60초, `exp`는 현재 시각 + 9분이다.
- **표준출력 계약**: 성공 시 표준출력에는 설치 토큰 한 줄만 쓴다. 만료 시각·진단·진행 메시지는 표준오류로만 쓴다. 실패 시 표준출력은 비어 있고 종료 코드는 1이다.
- **비밀 비노출 계약**: 개인키, App JWT, 발급 토큰의 값은 어떤 진단에도 남기지 않는다. 진단은 해당 값을 마스킹한 형태로만 쓴다.
- 설치 토큰의 유효 기간은 1시간이다. 401로 만료가 확인되면 토큰을 재발급한다.
- 읽기 전용 확인 모드(`--check`)는 토큰을 발급하지 않는다. 표준출력은 비어 있고, 진단과 만료 계산만 표준오류에 쓴다.

## 키 보관

- 개인키는 저장소 밖에 둔다. 기본 위치는 `~/.config/wintrover-automation/app.pem`(권한 `0600`)이며, 같은 디렉터리의 `config.json`이 `appId`와 `installationId`를 담는다.
- 키 소지와 토큰 소지는 동치가 아니다. 키는 서버 측에서 폐기될 때까지 토큰을 발급할 수 있으므로 키 파일 자체를 보호한다.

## 병합 경로

- 정상 경로: App이 PR을 작성 → `validate` 필수 검사 통과 → 오너(다른 신원)의 승인 리뷰 1건 → squash 병합.
- 예외 경로: 오너의 명시적 규칙 우회(bypass). 감사 기록 대상이며 정상 병합과 동일하게 취급하지 않는다.

## 잔류 위험

- Pages 배포는 `main` push로 독립적으로 트리거된다. ruleset은 유일한 병합 게이트이므로, 오너의 규칙 우회 병합은 검증에 실패한 커밋도 그대로 배포한다. 기록된 잔류 위험이며 본 슬라이스에서 해결하지 않는다.

## 관련

- [AGENTS.md §1.1](../../AGENTS.md) — 병합 권위
- [docs/agents/operations.md](../agents/operations.md) — 자격 증명 운영 절차
- [docs/agents/quality-gates.md](../agents/quality-gates.md) — 집행 체인
