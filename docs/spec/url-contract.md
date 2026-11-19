# 공개 URL 계약 (`url-contract.json`)

> 이 문서는 공개 URL 장부와 append-only 별칭 규칙의 정본이다. URL·locale 경로 원칙은 [url-architecture.md](url-architecture.md), 빌드 산출물 규칙은 [build-pipeline.md](build-pipeline.md), 검사 순서는 [../agents/quality-gates.md](../agents/quality-gates.md)에 있다.

## 권위

- 저장소 루트의 `url-contract.json`이 **canonical URL과 alias URL의 단일 권위**다.
- `scripts/build-github.ts`의 `loadUrlContract(root)`가 registry를 읽고, 빌드는 registry에 없는 alias를 만들지 않는다.
- alias의 목적지·존재 여부를 코드 상수나 `public/` 파일로 중복 선언하지 않는다.

## 스키마

```json
{
  "version": 1,
  "urls": [
    { "url": "/", "kind": "canonical", "locale": "en" },
    { "url": "/kr/", "kind": "alias", "target": "/ko/", "evidence": "existing public locale alias" }
  ]
}
```

- `version`은 `1`이다. 다른 값은 파싱 실패다.
- `urls`는 URL 기준으로 정렬한다. 파일은 2-space JSON과 trailing newline을 쓰며 `pnpm run url-contract:update`가 이 형식을 강제한다.
- `url`은 root-relative이고 leading slash와 trailing slash를 모두 가진다. `//`, `..`, query, fragment, backslash, 공백은 허용하지 않는다.
- `kind: "canonical"`은 `locale`(`"en"` 또는 `"ko"`)을 요구한다. URL prefix와 locale이 다르면 위반이다.
- `kind: "alias"`는 `target`(등록된 URL)과 `evidence`(비어 있지 않은 문자열)를 요구한다.
- URL locale은 prefix로 결정한다. `/ko/`·`/kr/`은 한국어, 그 외는 영어다.

## canonical 집합

- canonical URL 집합은 다음의 파생 집합과 **정확히 같아야** 한다.
  - 고정 4개: `/`, `/ko/`, `/resume/`, `/ko/resume/`
  - 영어 포스트: `/post/<slug>/`
  - 한국어 포스트: `/ko/post/<slug>/`
- registry에만 있는 canonical(추가)과 파생에만 있는 canonical(누락)은 모두 빌드 실패다.
- 포스트 목록은 `scripts/post-entries.ts`의 `collectPostEntries(root, locale)`가 파생한다. 한 locale 안의 slug 중복과 파생 불가 slug는 기존과 동일하게 fail-closed다.
- 신규 포스트는 canonical을 append하는 것으로 반영한다. `pnpm run url-contract:update`가 누락 canonical을 추가한다.

## alias 해석과 체인

- `resolveAlias(contract, url)`은 `{ final, chain }`을 반환한다. `chain`은 시작 URL부터 최종 canonical까지 방문한 URL 목록이다.
- alias 체인은 허용한다. `A → B`, `B → C(canonical)`이면 `A`와 `B`의 `final`은 모두 `C`다.
- 모든 alias의 최종 목적지는 canonical이어야 한다.
- 다음은 위반이다: 자기 참조, 등록되지 않은 target, 순환 체인, alias URL이 파생 canonical과 충돌, 체인 중 locale 변경.
- 빌드 산출물은 alias별로 **최종 canonical**을 canonical 태그와 redirect 목적지로 사용한다.

## 전이 행렬 (append-only)

기준 revision 대비 head revision의 같은 URL 항목에 적용한다.

| 기준 | head | 판정 |
|---|---|---|
| canonical | canonical | 허용 (선언 locale 불변) |
| canonical | alias | 허용 (target 등록 + 최종 canonical + locale 불변) |
| alias | alias | target이 같을 때만 허용 (evidence 갱신은 허용) |
| alias | canonical | 금지 |
| 항목 있음 | 항목 없음 | 금지 (삭제) |
| locale A | locale B | 금지 |

- 새 canonical URL은 append할 수 있다(신규 포스트).
- 새 alias는 append할 수 있다. 단 target이 등록되어 있고 최종 canonical로 해석되어야 한다.
- 공개된 포스트의 slug를 바꾸는 정상 경로는 **기존 canonical을 alias로 전환하고 새 canonical을 append**하는 것이다. canonical을 지우고 새 URL만 추가하면 삭제 위반이다.
- alias target을 다른 URL로 바꾸는 retarget은 금지한다. 새 목적지가 필요하면 새 alias를 append하고 기존 alias는 그대로 둔다.

## CI bootstrap

- `.github/workflows/validate.yml`의 `URL contract append-only` 스텝이 PR·merge group에서 `scripts/verify-url-contract-append-only.ts --base <sha>`를 실행한다.
- base revision에 `url-contract.json`이 없으면 bootstrap이다. 이때 head registry가 파생 canonical 집합과 정확히 일치할 때만 통과한다.
- base revision에 registry가 있으면 base/head diff를 적용해 removed와 위반을 출력하고, 하나라도 있으면 non-zero로 종료한다.
- base commit을 resolve하지 못하면(fetch 실패 포함) 통과가 아니라 실패다.
- push·workflow_dispatch에서는 이 스텝을 실행하지 않는다. `pnpm run build:github`의 registry 검증은 모든 트리거에서 실행된다.

## sitemap과 locale 별칭

- sitemap에는 canonical URL만 넣는다. alias URL은 어떤 경우에도 포함하지 않는다. 빌드와 `verifyAliasOutputs`가 이를 검사한다.
- `/kr/`은 `/ko/`로 수렴하는 locale alias다. 별칭 문서는 canonical `/ko/`, 0초 meta refresh, noscript 링크를 유지하고 sitemap·hreflang에 넣지 않는다.
- 모든 alias 문서는 `noindex,follow`를 가진다. 포스트 alias는 canonical=최종 canonical, 0초 meta refresh와 `location.replace`를 유지한다. 영어 alias는 `dist/ko/post/<옛 slug>/`를 만들지 않는다.

## 런타임 퍼지 폴백은 권위가 아니다

- `src/lib/postLoader.ts`의 `toLegacyCanonicalSlug` 기반 조회는 과거 링크의 **런타임 관용 조회**일 뿐 alias 권위가 아니다.
- 새 alias를 추가할 때 런타임 폴백에 의존하지 않는다. 공개 URL 변경은 반드시 registry에 alias로 기록한다.

## 보장 범위

- 이 계약은 **정상적인 변경 PR에서의 회귀**를 막는다: canonical 삭제, alias retarget, alias→canonical 전환, locale 변경, sitemap 노출.
- 다음은 보장 범위 밖이다.
  - 악의적 쓰기: 한 PR에서 registry·검증 스크립트·테스트를 함께 수정하면 게이트 의미가 바뀔 수 있다.
  - ruleset bypass 또는 `validate`를 거치지 않는 main 직접 push.
  - 계약 도입 이전에 이미 사라진 URL의 복원.
  - 검증 명령 정의(`package.json`)·의존성 잠금·워크플로 파일의 작성자 변경.
- 이 한계는 AGENTS.md §1.1의 무리뷰 수용 조건과 같은 성격이며, 플랫폼 권한 영역(ruleset·workflows·secrets)이 최종 경계다.

## 관련

- [url-architecture.md](url-architecture.md) — 경로·locale·slug 정규화
- [build-pipeline.md](build-pipeline.md) — 빌드 산출물과 검증기
- [../agents/quality-gates.md](../agents/quality-gates.md) — validate 스텝 순서
