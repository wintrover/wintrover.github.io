# 공개 계약 보장 경계와 결정 등록부

> 이 문서는 공개 URL·빌드·배포 계약이 **무엇을 보장하고 무엇을 보장하지 않으며, 무엇이 아직 결정되지 않았는가**의 정본이다. URL 장부 규칙은 [url-contract.md](url-contract.md), 배포 승인 계약은 [production-acceptance.md](production-acceptance.md), 증거 보존 정책은 [evidence-retention.md](evidence-retention.md)에 있다.
>
> 이 문서는 새로운 집행 수단을 만들지 않는다. 보장은 이미 존재하는 명령과 관측이 뒷받침할 때만 기록한다. 보장으로 승격하려면 실행 가능한 명령·관측·실패 조건이 먼저 있어야 한다.

## 표기

- **Guaranteed** — 저장소 안의 명령이 실행될 때마다 관측하고, 어긋나면 non-zero로 끝나는 것.
- **Not guaranteed** — 명시적으로 주장하지 않는 것. 이 목록의 항목을 보장으로 인용하지 않는다.
- **UNKNOWN** — 코드·문서·로컬 관측만으로 결정할 수 없어 오너 결정이 필요한 항목. 결정이 기록되기 전까지 Guaranteed로 승격하지 않는다.

## 보장 (Guaranteed)

### G1. canonical 집합의 삼중 일치

- **registry == build-derived**: `pnpm run build:github`의 `validateUrlContract`가 registry canonical 집합과 `deriveCanonicalUrls` 파생 집합을 비교한다. registry에만 있는 URL과 파생에만 있는 URL은 각각 빌드 실패다. 커밋된 registry의 동등성은 `tests/url-contract.test.ts`가 고정한다.
- **registry == production sitemap multiset**: `pnpm run verify:production`이 배포된 `/sitemap.xml`의 `<loc>`를 root-relative로 정규화하고 기대 canonical 집합과 다중집합으로 비교한다. 누락·추가·중복이 각각 0이어야 한다. 기대 집합은 `url-contract.json`이 있으면 registry canonical이다.
- **시점 한정**: 삼중 일치는 (a) 매 빌드의 registry==derived, (b) 마지막 수동 승인 실행의 registry==production으로 구성된다. "지금도 일치한다"는 주장은 마지막 승인 이후 registry·빌드·배포가 바뀌지 않았을 때만 성립한다. 연속 감시가 아니다.
- 승인 도구는 로컬 `dist/`가 아니라 배포 표면을 읽는다. 로컬 빌드 산출물과 배포본의 일치는 배포 승인의 증거가 아니다.

### G2. append-only 게이트

- `.github/workflows/validate.yml`의 `URL contract append-only` 스텝이 `pull_request`·`merge_group`에서 `scripts/verify-url-contract-append-only.ts --base <base sha>`를 실행한다. base를 resolve하지 못하면 통과가 아니라 실패다.
- 정상 PR에서 차단하는 것: 항목 삭제, alias target 변경(retarget), alias→canonical 역전이, locale 변경, canonical 삭제 후 새 URL만 추가.
- 허용하는 상태 전이는 **canonical→alias 하나**다. 조건은 target이 등록되어 있고 최종 canonical로 해석되며 locale이 변하지 않는 것이다. canonical 유지와 alias의 evidence 갱신은 전이가 아니며, 새 canonical·새 alias의 append는 허용된다.
- **적용 범위**: push·`workflow_dispatch`에서는 이 스텝을 실행하지 않는다. 그 트리거에서는 `build:github`의 canonical 집합 검증만 실행되며 append-only diff는 실행되지 않는다.
- 게이트의 의미는 같은 PR에서 워크플로·스크립트가 바뀌지 않았다는 가정 위에서만 성립한다(N1).

### G3. alias 문서

- registry의 모든 alias에 대해 빌드가 alias 문서를 만든다(`buildAliasPages`). 문서의 canonical은 체인의 **최종 canonical**이고 robots는 `noindex,follow`다.
- alias 문서는 sitemap에 들어가지 않는다. 빌드의 `verifySitemapContract`·`verifyAliasOutputs`와 배포 승인의 sitemap 다중집합 검사가 이를 관측한다.
- `/kr/`은 `/ko/`로 수렴하는 locale alias다: canonical `/ko/`, 0초 meta refresh, noscript 링크. 포스트 alias는 canonical=최종 canonical, 0초 meta refresh, `location.replace`를 유지한다.
- 이 보장은 문서 내용에 대한 것이며 HTTP 상태 코드 의미에 대한 것이 아니다(UNKNOWN-B).

### G4. SPA head 단일 소유자

- 실행 중인 SPA에서 `document.title`과 `link[rel="canonical"]`의 소유자는 `src/lib/seo.ts` 하나다. 라우트 컴포넌트는 canonical·title을 `<svelte:head>`로 중복 생성하지 않는다.
- 정적 셸 `index.html`은 no-JS·크롤러 진입을 위해 canonical·title을 유지하고, SPA 부팅 후 컨트롤러가 제자리에서 갱신해 canonical이 항상 정확히 1개로 수렴한다. `tests/seo-head.test.ts`가 라우트 전환 후 canonical 1개를 관측한다.
- **범위**: title·canonical 한정. description·OG·JSON-LD의 소유 규칙은 [url-architecture.md](url-architecture.md)에 있으나 이 문서의 보장 목록에는 넣지 않는다.

### G5. 프로덕션 승인은 수동 witness

- `pnpm run verify:production`은 배포 후 사람이 실행하는 witness다. CI(`validate`)·pre-commit(`prek`)에 연결되지 않는다.
- 이 실행은 배포된 표면을 관측하지, 특정 커밋을 검증하지 않는다. 승인 결과는 실행 시점에 관측한 배포의 SHA와 함께 기록해야 하며, SHA 없는 "승인 통과"는 이 문서에서 보장으로 취급하지 않는다.
- 초록 `validate`는 프로덕션에 대한 증거가 아니다. 배포 승인은 별도의 사후 관측이다.

## 보장하지 않음 (Not guaranteed)

다음은 이 저장소가 보장하지 않는다. 보장 목록과 혼합해 인용하지 않는다.

- **N1. 악의적 PR 작성자.** 한 PR에서 `.github/workflows/validate.yml`·`scripts/`·`package.json`·`pnpm-lock.yaml`·`tests/**`를 함께 수정하면 초록 `validate`는 다른 검증을 통과한 것이다. 자동화 App은 `workflows` 권한이 없지만, 그 권한을 가진 사람 작성자는 워크플로를 바꿀 수 있다. 최종 경계는 플랫폼 권한이다.
- **N2. 오너의 ruleset bypass.** `main-protection` ruleset의 bypass actor는 오너(User, `pull_request` 모드) 하나다. bypass는 `pull_request` 모드에서 감사 항목을 남기지만 정상 병합과 동일하지 않다. bypass로 병합된 커밋도 Pages에 배포된다.
- **N3. Pages 배포는 validate 성공과 독립.** `pages-deploy.yml`은 `push`(main)에서 시작하고 validate 완료를 기다리는 `workflow_run`·`needs`가 없다. validate가 red인 커밋이 main에 도달하면(예: bypass) 그대로 배포된다.
- **N4. 계약된 Axiom 저장소 외 외부 링크.** 승인 도구가 판정하는 외부 목적지는 `/ko/resume/`의 `https://github.com/Archright/Axiom` 하나다. giscus, 외부 CDN, 기타 외부 링크의 도달성·link rot·내용은 범위 밖이다.
- **N5. 등록된 적 없는 과거 URL.** registry는 도입 이후 등록된 URL만 안다. 도입 전에 사라진 URL, 한 번도 등록되지 않은 URL, `/kr/post/...` 같은 `/kr` 하위 경로는 복원 대상이 아니다. 런타임 퍼지 조회는 편의일 뿐 alias 권위가 아니다.
- **N6. 커밋된 해시 이상의 증거 불변성.** `public/evidence/<id>/SHA256SUMS`는 같은 디렉터리 파일과 해시가 일치함만 증명한다. 파일과 sums를 함께 수정하면 해시 검증은 다시 통과할 수 있다. 게시 시점·게시 후 불변성의 외부 앵커는 없다(UNKNOWN-D).
- **N7. HTTP 301/308 의미.** `/kr`의 301은 호스트의 trailing-slash 정규화이고, `/kr/`→`/ko/`는 0초 meta refresh다. alias 문서가 HTTP 301/308로 응답한다고 주장하지 않는다(UNKNOWN-B).

## UNKNOWN 결정 등록부

UNKNOWN은 결정 전까지 보장으로 승격하지 않는다. 각 항목은 **코드로 결정할 수 없는 이유 · 오너 · 결정 트리거 · 다음 행동**을 가진다.

### UNKNOWN-A — `/kr/*` 레거시 경로

- **코드로 결정할 수 없는 이유**: 저장소에는 외부 인바운드 링크·검색 인덱스 데이터가 없다. registry는 등록된 URL만 알므로 `/kr/post/...`가 실제 인바운드를 받았는지는 외부 관측으로만 답할 수 있다. 현재 정책은 "범위 밖"이라고만 말한다.
- **오너**: 저장소 오너 `@wintrover`.
- **결정 트리거**: Google Search Console 또는 외부 referrer에서 `/kr/` 하위 URL 인바운드가 관측될 때.
- **다음 행동**: Search Console Page indexing report(필요 시 URL Inspection)에서 `/kr/` prefix URL 목록을 export하고, 외부 referrer 로그가 있으면 함께 첨부해 관측 목록을 만든다. URL별로 (a) registry alias append, (b) 404 유지 중 하나를 결정하고, (a)면 alias append PR에서 append-only 게이트를 통과시킨다.

### UNKNOWN-B — 실제 HTTP 301/308

- **코드로 결정할 수 없는 이유**: GitHub Pages는 정적 파일 호스팅이며 서버 측 언어를 지원하지 않는다. 경로별 서버 리다이렉트를 저장소에서 구성하는 인터페이스가 없고, 사용자 도메인의 자동 리다이렉트는 apex↔www와 HTTPS 강제뿐이다. HTTP 상태 코드 의미는 호스팅·도메인 권한과 제품 요구의 함수다.
- **오너**: 저장소 오너 `@wintrover`.
- **결정 트리거**: HTTP status semantics(301/308)에 대한 명시적 요구. 예: 검색 마이그레이션 감사, 외부 계약, 커스텀 도메인 이전.
- **다음 행동**: 커스텀 도메인·호스팅 도입 여부를 ADR로 결정한다. 도입 시 `/kr`·`/kr/*` 매핑을 호스트 리다이렉트 규칙으로 옮기고 `verify-production`의 `/kr` 홉 판정을 HTTP 301/308 기준으로 교체한다. 도입 전까지 meta refresh를 301로 표기하지 않는다.

### UNKNOWN-D — 증거 신뢰 앵커

- **코드로 결정할 수 없는 이유**: 해시는 파일 내용만 묶는다. 게시 시점과 게시 후 불변성은 저장소 밖 신뢰 앵커가 필요하며, 커밋은 자기 게시 시각을 증명하지 못한다.
- **오너**: 저장소 오너 `@wintrover`.
- **결정 트리거**: 게시된 증거 스냅샷이 게시 후 변경되지 않았음을 증명해야 하는 요구.
- **다음 행동**: 순서대로 실행한다. 1순위는 GitHub Immutable Releases — 스냅샷을 release asset으로 게시하고 immutable releases를 활성화해 asset·tag를 잠그고 release attestation을 남긴다. 2순위는 Sigstore Rekor — 스냅샷 digest를 서명해 투명성 로그에 기록하고 inclusion proof를 검증한다. 1순위가 불가능할 때만 2순위로 간다.

### UNKNOWN-E — path routing

- **코드로 결정할 수 없는 이유**: hash routing 유지 여부는 정적 Pages + `404.html` 폴백이라는 배포 형태와 UX·SEO 트레이드오프의 함수다. 코드는 현재 라우팅을 기술할 뿐, 주소창·새로고침·복사 링크가 path URL이어야 한다는 제품 요구를 스스로 만들 수 없다. path routing은 정적 호스팅의 rewrite·폴백 요구를 새로 만든다.
- **오너**: 저장소 오너 `@wintrover`.
- **결정 트리거**: 주소창·새로고침·복사 링크가 path URL이어야 한다는 제품 UX 요구.
- **다음 행동**: path routing ADR을 작성해 (a) Pages `404.html` 폴백, (b) rewrite 지원 호스팅, (c) hash 유지 중 하나를 선택한다. 전환 시 기존 hash URL 호환 맵과 `url-contract.json` append-only를 유지하고 `verify-production`의 `location.replace("/ko/#/post/<slug>")` 계약을 갱신한다.

### UNKNOWN-ADV — Adversarial validation boundary

- **코드로 결정할 수 없는 이유**: 저장소 안에서 validate 정의·테스트·빌드 설정은 PR 작성자가 바꿀 수 있다. 검증 권위를 PR 작성자가 편집할 수 없는 곳으로 옮기는 것은 플랫폼·조직 권한 문제다. GitHub Docs는 조직/엔터프라이즈 ruleset에서 "Require workflows to pass before merging"으로 다른 저장소의 워크플로를 요구할 수 있다고 설명한다. 이 저장소는 사용자 소유이므로 조직 ruleset을 적용할 수 없다.
- **오너**: 저장소 오너 `@wintrover`.
- **결정 트리거**: 회귀 방지를 넘어선 보안 요구. 예: 신뢰할 수 없는 기여자, 규제·감사 요구.
- **다음 행동**: 저장소를 조직으로 이전할지 결정한다. 이전 시 조직 ruleset에 required workflow를 등록하고, 그 워크플로를 PR 작성자가 write 권한을 갖지 않은 저장소에 둔다. 이후 자동화 App 권한(`contents:write`·`pull_requests:write`·`checks:read`·`actions:read`)이 그대로인지 확인하고, N1을 Guaranteed로 승격할지 재판정한다.

## 권위 체인 (Authority chain)

공개 표면의 권위는 다음 순서로 집행된다.

1. **protected main** — ruleset `main-protection`(id 25404151): deletion 금지, non_fast_forward 금지, required_status_checks(`validate`, strict). PR 필수 규칙은 없다.
2. **required validate** — `validate.yml`의 스텝 순서(biome → typecheck → test → build:github → base fetch → append-only)가 필수 검사의 정의다. strict 정책이므로 main이 움직이면 PR은 최신 base로 다시 validate를 통과해야 한다.
3. **auto-merge** — 저장소 `allow_auto_merge: true`. write 권한 보유자(자동화 App 포함)가 auto-merge를 켜면 필수 검사 통과 후 사람 승인 없이 병합된다. 자동화 경로는 squash를 관례로 쓴다.
4. **Pages** — main push가 `pages-deploy.yml`을 트리거하고 `actions/deploy-pages`가 배포한다. 이 단계는 validate 결과를 입력으로 받지 않는다.

- **사람 우회**: bypass actor는 오너 전용(`pull_request` 모드)이며 bypass 감사 항목을 남긴다. bypass 병합은 정상 병합과 동일하게 취급하지 않는다. 에이전트(App)는 bypass actor가 아니다.
- **CI 통과 ≠ 의미 동등성**: 검증 명령 정의(`package.json`)·의존성 잠금(`pnpm-lock.yaml`)·테스트·빌드 설정은 PR 작성자가 바꿀 수 있다. 초록 `validate`는 "그 PR이 정의한 검증 체인"의 통과를 뜻하며, 체인의 의미가 이전과 같다는 것까지 보증하지 않는다. 이 한계는 무리뷰 전환의 수용 조건이다(AGENTS.md §1.1).

## 참조 (References)

플랫폼 주장의 출처다. 저장소 밖 동작은 이 문서가 아니라 아래 문서를 따른다.

- GitHub ruleset 개요: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- ruleset 규칙 목록(required workflows 포함): <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets>
- 조직 ruleset과 required workflow: <https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization>
- ruleset REST 스키마(`bypass_mode`, `exempt`의 감사 예외): <https://docs.github.com/en/rest/repos/rules>
- auto-merge: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request>
- GitHub Pages는 정적 파일 호스팅(서버 측 언어 미지원): <https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>
- 사용자 도메인 자동 리다이렉트 범위(apex↔www): <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages>
- HTTPS 강제 리다이렉트: <https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>
- GitHub Immutable Releases(asset·tag 잠금, release attestation): <https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases>
- 릴리스 무결성 검증(`gh release verify`): <https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity>
- Sigstore Rekor(append-only·tamper-evident 투명성 로그, inclusion proof): <https://docs.sigstore.dev/logging/overview/>
- Google Search Console Page indexing report: <https://support.google.com/webmasters/answer/7440203>

## 관련

- [url-contract.md](url-contract.md) — registry 스키마·전이 행렬·append-only 게이트
- [production-acceptance.md](production-acceptance.md) — 배포 승인 계약과 판정 항목
- [evidence-retention.md](evidence-retention.md) — 증거 스냅샷 보존 정책
- [../agents/quality-gates.md](../agents/quality-gates.md) — validate 스텝·ruleset·로컬 훅
- [AGENTS.md §1.1](../../AGENTS.md) — 병합 권위와 무리뷰 수용 조건
