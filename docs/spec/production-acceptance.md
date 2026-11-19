# 프로덕션 승인 계약

> 이 문서는 배포된 `https://wintrover.github.io`의 승인 표면(HTTP·브라우저·선택적 SPA head SEO)에 대한 정본이다. 실행 절차는 [docs/agents/production-acceptance.md](../agents/production-acceptance.md)에 있다.

## 목적

- 배포 후 사용자가 실제로 받는 응답과 브라우저 렌더링을 기계적으로 재현해 승인한다.
- 승인 도구는 `scripts/verify-production.mjs`이며, 모든 검사는 결정적 순서로 실행되고 실패는 숨기지 않는다(fail-closed).

## 독립성 불변식

- 기대 포스트 slug는 `scripts/build-github.ts`의 `collectPostEntries(root, locale)`에서만 도출한다. slug 목록을 스크립트에 하드코딩하지 않는다.
- 기대 sitemap 집합은 `url-contract.json`(있을 때) → `dist/sitemap.xml` → 소스 파생 순으로 정해진다. 62라는 총계를 판정에 쓰지 않는다.
- 자산 정확성은 실제 브라우저 요청의 응답 상태·실패 이벤트·이미지 `naturalWidth`로 관측한다.
- 승인 도구는 `deriveKoPublicAssets`를 호출하지 않는다. 빌드 allowlist와 배포 표면이 일치한다는 사실은 배포 승인의 증거가 아니다.

## HTTP 계약

- KO 포스트 랜딩(`/ko/post/<slug>/`)은 200, 정확한 canonical(`https://wintrover.github.io/ko/post/<slug>/`), 정확한 `location.replace("/ko/#/post/<slug>")`를 만족한다.
- EN 포스트 랜딩(`/post/<slug>/`)은 200이다.
- 루트는 `/` 200 + `html lang="en"`, `/ko/` 200 + `html lang="ko"`, `/resume/` 200, `/ko/resume/` 200이다.
- `/kr` 체인은 리다이렉트를 자동으로 따라가지 않고(`redirect: "manual"`) 홉마다 판정한다.
  - `/kr`은 301이고 `Location`은 `/kr/`이다.
  - `/kr/`은 200이고 `meta http-equiv="refresh"`의 content가 정확히 `0; url=/ko/`이며 canonical은 `https://wintrover.github.io/ko/`, robots는 `noindex`를 포함한다.
  - `/ko/`는 200이다. 두 번째 이동이 HTTP 301이면 실패한다.
- `/ko`는 301로 `/ko/`에 수렴한다.
- KO 트리의 `/ko/evidence/`·`/ko/404.html`·`/ko/.nojekyll`·`/ko/auto-merge-verification.txt`·`/ko/sitemap.xml`·`/ko/robots.txt`는 404다.
- 루트 대응 자산 `/evidence/p0d2g/README.md`·`/404.html`·`/.nojekyll`·`/auto-merge-verification.txt`·`/images/profile.png`·`/kr/`는 200이다.

## sitemap 집합 계약

- 기대 집합의 우선순위는 `url-contract.json` → `dist/sitemap.xml` → 소스 파생(`collectPostEntries`)이다.
- `url-contract.json`은 저장소 루트에 있을 때만 사용한다. 허용 형식은 canonical URL 배열, `{ "canonical": [...], "aliases": [...] }`, 또는 `{ "urls": [...] }` registry다. registry 항목은 `kind`(`canonical` | `alias`)로 분리하며, 알 수 없는 kind는 `FAIL setup`이다. 각 canonical 항목은 문자열 또는 `{ "url" | "loc" | "canonical": "..." }`이고, alias 항목은 `url`+`target`을 쓴다.
- `url-contract.json`의 canonical URL은 host를 제거한 root-relative 경로로 정규화해 비교한다. production `/sitemap.xml`의 `<loc>`도 root-relative로 정규화한다.
- 판정은 **다중집합 완전 동등성**이다. 누락·추가·중복이 각각 0개여야 한다. 62는 소스 파생 집합의 현재 총계를 출력할 뿐 판정 기준이 아니다.
- alias 항목은 sitemap에 없어야 한다. alias의 `from`은 경로/URL 또는 포스트 slug(`/post/<slug>/`로 해석)이며 `to`/`target`은 root-relative 경로로 정규화한다. alias의 단일 권위는 `url-contract.json`이며 빌드 스크립트 export에 의존하지 않는다. `/kr` 항목도 0개다.
- `url-contract.json`이 존재하는데 JSON이 깨졌거나 canonical 배열이 없으면 `FAIL setup`으로 종료한다(fail-closed).

## 404 3단계 계약

1. **최초 HTTP 응답**: 미지의 경로는 404이고, `Location` 헤더가 없고, canonical 링크가 없고, robots는 `noindex,nofollow`다. 이 판정은 브라우저 최종 DOM과 합치지 않는다.
2. **JS 리다이렉트**: 브라우저는 같은 origin의 hash URL(`#/...`)에 착지하고, 그 새 문서 응답은 200이다. 최종 navigation response가 200임을 관측한다.
3. **SPA NotFound DOM**: `document.title`은 로케일 NotFound 문구(`Page not found` / `페이지를 찾을 수 없습니다`), canonical은 정확히 1개이며 로케일 루트(`https://wintrover.github.io/` 또는 `.../ko/`)다. robots에 `noindex`가 없어야 하고(index,follow), SPA JSON-LD는 0개다. 이 판정은 1·2단계와 별도의 검사(`browser:unknown:dom`)다.

## 브라우저 계약

- 모든 KO 포스트 랜딩은 최종 hash `#/post/<slug>`, `html lang=ko`, 한국어 h1을 만족한다.
- 같은 origin의 `/ko/` 응답 중 status 400 이상은 0개이고, 같은 origin의 실패 요청은 0개다. 교차 origin 임베드(giscus, 외부 CDN, 팝업 목적지)는 사이트 자산 계약의 범위가 아니다.
- `.markdown-content img` 중 `naturalWidth`가 0인 이미지는 0개다.
- `/ko/`와 `/ko/resume/`는 `lang=ko`로 렌더링되고 같은 origin의 비정상 요청이 없다.
- `/ko/resume/`의 Axiom 카드 href는 정확히 `https://github.com/Archright/Axiom`이며, 클릭으로 생성된 팝업의 최종 URL은 해당 저장소 URL로 시작한다.
- `/kr`은 브라우저에서 `/ko/`로 착지한다.

## SPA head SEO 플래그

- `--include-spa-seo`는 기본 비활성이다. SPA head 단일 소유자 수정(#52)이 배포되어 현재 프로덕션은 이 검사를 통과하지만, 기본 실행에서 skip한다.
- 플래그를 켜면 각 KO 포스트 페이지에서 canonical이 정확히 1개이며 포스트 URL과 같고, `document.title`이 포스트 제목과 같아야 한다.
- 404 3단계(SPA NotFound DOM)는 플래그와 무관하게 기본 실행에서 `browser:unknown:dom`으로 판정한다.
- 플래그를 켜면 소스 frontmatter에서 실제 존재하는 category 하나와 tag 하나를 파생해 다음 hash 경로의 최종 DOM을 판정한다.
  - `/ko/#/category/<categorySlug>`, `/ko/#/category/<categorySlug>/tag/<tagSlug>`
  - `/#/category/<categorySlug>`, `/#/category/<categorySlug>/tag/<tagSlug>`
  - canonical은 정확히 1개이고 값은 로케일 루트다. `#`을 포함하면 실패한다. hashless 경로(`/ko/category/<categorySlug>/`)는 배포에서 404이므로 canonical로 기대하지 않는다.
  - `document.title`은 비어 있지 않고 카테고리 라벨을 포함해야 한다. category 경로는 라벨과 정확히 같고, tag 경로는 `<라벨> #<tagSlug>` 형식이다.
- 기본 실행은 오늘의 프로덕션에 대해 통과해야 한다. SPA head 수정(#52)은 배포되었으므로 플래그를 기본값으로 승격하는 별도 변경을 수행할 수 있다.

## 판정과 출력

- 검사마다 `ok`/`FAIL` 한 줄을 출력하고, 선택 검사는 `SKIP`으로 표시한다.
- 마지막 줄은 `RESULT checks=N fail=M`이며, 실패가 하나라도 있으면 종료 코드는 0이 아니다.
- 이 계약은 수동 post-deploy gate다. CI·pre-commit에 연결하지 않는다.

## 관련

- [docs/agents/production-acceptance.md](../agents/production-acceptance.md) — 실행 절차·명령·트러블슈팅
- [docs/spec/url-architecture.md](url-architecture.md) — URL·locale 계약
- [docs/spec/build-pipeline.md](build-pipeline.md) — 빌드 산출물·sitemap 계약
- [AGENTS.md §0.3](../../AGENTS.md) — 증거 문화 불변식
