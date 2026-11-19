# 프로덕션 승인 계약

> 이 문서는 배포된 `https://wintrover.github.io`의 승인 표면(HTTP·브라우저·선택적 SPA head SEO)에 대한 정본이다. 실행 절차는 [docs/agents/production-acceptance.md](../agents/production-acceptance.md)에 있다.

## 목적

- 배포 후 사용자가 실제로 받는 응답과 브라우저 렌더링을 기계적으로 재현해 승인한다.
- 승인 도구는 `scripts/verify-production.mjs`이며, 모든 검사는 결정적 순서로 실행되고 실패는 숨기지 않는다(fail-closed).

## 독립성 불변식

- 기대 포스트 slug는 `scripts/build-github.ts`의 `collectPostEntries(root, locale)`에서만 도출한다. slug 목록을 스크립트에 하드코딩하지 않는다.
- 자산 정확성은 실제 브라우저 요청의 응답 상태·실패 이벤트·이미지 `naturalWidth`로 관측한다.
- 승인 도구는 `deriveKoPublicAssets`를 호출하지 않는다. 빌드 allowlist와 배포 표면이 일치한다는 사실은 배포 승인의 증거가 아니다.

## HTTP 계약

- KO 포스트 랜딩(`/ko/post/<slug>/`)은 200, 정확한 canonical(`https://wintrover.github.io/ko/post/<slug>/`), 정확한 `location.replace("/ko/#/post/<slug>")`를 만족한다.
- EN 포스트 랜딩(`/post/<slug>/`)은 200이다.
- 루트는 `/` 200 + `html lang="en"`, `/ko/` 200 + `html lang="ko"`, `/resume/` 200, `/ko/resume/` 200이다.
- `/kr`은 301로 `/kr/`에 수렴하고, `/kr/`은 200 + canonical `/ko/` + refresh `/ko/`다. `/ko`는 301로 `/ko/`에 수렴한다.
- `/sitemap.xml`의 `<loc>`는 정확히 62개다. `dist/sitemap.xml`이 존재하면 그 다중집합과, 없으면 소스에서 도출한 기대 집합과 정확히 일치해야 한다. `/kr` 항목과 레거시 포스트 별칭 `from` 항목은 0개다.
- KO 트리의 `/ko/evidence/`·`/ko/404.html`·`/ko/.nojekyll`·`/ko/auto-merge-verification.txt`·`/ko/sitemap.xml`·`/ko/robots.txt`는 404다.
- 루트 대응 자산 `/evidence/p0d2g/README.md`·`/404.html`·`/.nojekyll`·`/auto-merge-verification.txt`·`/images/profile.png`·`/kr/`는 200이다.
- 미지의 경로는 HTTP 404이며, 브라우저에서는 NotFound 문구가 렌더링된다.

## 브라우저 계약

- 모든 KO 포스트 랜딩은 최종 hash `#/post/<slug>`, `html lang=ko`, 한국어 h1을 만족한다.
- 같은 origin의 `/ko/` 응답 중 status 400 이상은 0개이고, 같은 origin의 실패 요청은 0개다. 교차 origin 임베드(giscus, 외부 CDN, 팝업 목적지)는 사이트 자산 계약의 범위가 아니다.
- `.markdown-content img` 중 `naturalWidth`가 0인 이미지는 0개다.
- `/ko/`와 `/ko/resume/`는 `lang=ko`로 렌더링되고 같은 origin의 비정상 요청이 없다.
- `/ko/resume/`의 Axiom 카드 href는 정확히 `https://github.com/Archright/Axiom`이며, 클릭으로 생성된 팝업의 최종 URL은 해당 저장소 URL로 시작한다.
- `/kr`은 브라우저에서 `/ko/`로 착지한다.

## SPA head SEO 플래그

- `--include-spa-seo`는 기본 비활성이다. 현재 프로덕션 SPA head가 stale `document.title`과 canonical 2개를 배출하는 부채가 해소되어 배포되기 전까지 기본 실행은 이 검사를 skip한다.
- 플래그를 켜면 각 KO 포스트 페이지에서 canonical이 정확히 1개이며 포스트 URL과 같고, `document.title`이 포스트 제목과 같아야 한다.
- 기본 실행은 오늘의 프로덕션에 대해 통과해야 한다. SPA head 수정이 배포되면 플래그를 기본값으로 승격하는 별도 변경을 수행한다.

## 판정과 출력

- 검사마다 `ok`/`FAIL` 한 줄을 출력하고, 선택 검사는 `SKIP`으로 표시한다.
- 마지막 줄은 `RESULT checks=N fail=M`이며, 실패가 하나라도 있으면 종료 코드는 0이 아니다.
- 이 계약은 수동 post-deploy gate다. CI·pre-commit에 연결하지 않는다.

## 관련

- [docs/agents/production-acceptance.md](../agents/production-acceptance.md) — 실행 절차·명령·트러블슈팅
- [docs/spec/url-architecture.md](url-architecture.md) — URL·locale 계약
- [docs/spec/build-pipeline.md](build-pipeline.md) — 빌드 산출물·sitemap 계약
- [AGENTS.md §0.3](../../AGENTS.md) — 증거 문화 불변식
