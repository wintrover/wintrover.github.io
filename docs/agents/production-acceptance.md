# 프로덕션 승인 절차

> 이 문서는 [docs/spec/production-acceptance.md](../spec/production-acceptance.md)의 계약을 실행하는 절차다. 규칙의 정본은 `docs/spec/`이며, 이 문서는 명령·전제·출력 해석만 담는다.

## 목적

- 배포된 `https://wintrover.github.io`를 HTTP와 실제 브라우저로 검사해, 배포 회귀를 정확한 실패 체크로 재현한다.
- **수동 post-deploy gate다.** CI(`validate`)나 pre-commit(`prek`)에 연결하지 않는다. 외부 네트워크·관리 Chrome·수 분의 실행 시간에 의존하므로 필수 검사로 만들지 않는다.

## 전제

- 저장소 루트에서 실행한다. `pnpm install`이 완료되어 `puppeteer`와 `tsx`가 `node_modules`에 있어야 한다.
- Puppeteer가 관리하는 Chrome을 사용한다. 브라우저 경로를 하드코딩하지 않으며 `/usr/bin/google-chrome`을 쓰지 않는다. 캐시는 기본적으로 `~/.cache/puppeteer`에 있다.
- 비밀 값은 필요하지 않다. 이 도구는 공개 프로덕션 표면만 읽는다.

## 명령

```sh
# 기본 실행: HTTP + 브라우저. SPA head SEO 검사는 skip.
pnpm run verify:production

# SPA head 수정 배포 후: canonical 1개 + document.title 일치까지 요구.
node scripts/verify-production.mjs --include-spa-seo
```

- `pnpm` 경유로 플래그를 넘길 때는 `pnpm run verify:production -- --include-spa-seo`를 쓴다.
- 로컬에 `dist/sitemap.xml`이 있으면 프로덕션 sitemap을 그 빌드 산출물과 비교한다. 산출물 비교까지 하려면 먼저 `pnpm run build:github`로 `dist/`를 만든 뒤 실행한다. `dist/`가 없으면 소스에서 도출한 기대 집합과 비교한다.
- KO/EN slug는 `scripts/build-github.ts`의 `collectPostEntries(root, locale)`에서 도출한다. 스크립트에 slug를 하드코딩하지 않는다.

## 출력 해석

- `ok   <check-id> <detail>` — 통과.
- `FAIL <check-id> <detail>` — 실패. detail에 관측값과 기대값이 함께 나온다.
- `SKIP spa-seo <reason>` — 기본 실행에서 SPA head SEO 검사를 건너뛴 상태다. `checks`에 포함되지 않는다.
- 마지막 줄 `RESULT checks=N fail=M` — 실행한 검사 수와 실패 수. `fail > 0`이면 종료 코드 1, 사용법 오류는 2다.
- HTTP 요청 타임아웃은 30초, 브라우저 탐색·대기 타임아웃은 45초로 고정되어 있다. 브라우저는 `finally`에서 닫힌다.

## 독립성 규칙

- 자산 정확성은 Puppeteer가 실제로 요청한 응답 상태, `requestfailed` 이벤트, 이미지 `naturalWidth`로 관측한다.
- `deriveKoPublicAssets`를 호출하지 않는다. 빌드 allowlist는 배포 승인의 증거가 아니다.
- 같은 origin의 요청만 사이트 자산 계약으로 판정한다. giscus·외부 CDN·GitHub 팝업 목적지 같은 교차 origin 실패는 검사 대상이 아니다.

## SPA head SEO 플래그

- 기본 실행은 `--include-spa-seo` 없이 통과해야 한다. 현재 프로덕션 SPA head는 stale `document.title`과 canonical 2개를 배출하는 부채가 있다.
- `--include-spa-seo`를 켜면 모든 KO 포스트에서 canonical이 정확히 1개이고 포스트 URL과 같은지, `document.title`이 포스트 제목과 같은지 검사한다.
- SPA head 수정이 배포되면 기본값으로 승격하는 별도 변경을 수행한다. 그 전까지 기본 실행에서 이 검사를 요구하지 않는다.

## 트러블슈팅

- 브라우저 실행 실패: `pnpm exec puppeteer browsers install chrome`로 관리 Chrome을 설치한 뒤 다시 실행한다. 경로를 직접 지정하지 않는다.
- 특정 포스트만 실패: `FAIL browser:post:<slug>`의 detail에서 hash·lang·h1·깨진 이미지 수·비정상 요청을 확인한다.
- sitemap 불일치: `RESULT`의 `multiset vs dist` 또는 `multiset vs source` 표기를 보고, 배포 산출물과 소스 중 어느 쪽이 기준이었는지 확인한다.
- `FAIL setup`: `tsx`/`puppeteer` 미설치 또는 `collectPostEntries` export 누락이다. `pnpm install`과 `scripts/build-github.ts`를 확인한다.

## 관련

- [docs/spec/production-acceptance.md](../spec/production-acceptance.md) — 승인 계약 정본
- [docs/agents/quality-gates.md](quality-gates.md) — CI·pre-commit 품질 게이트
- [docs/agents/operations.md](operations.md) — 도구·환경 운영
