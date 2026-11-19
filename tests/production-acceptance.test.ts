import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { collectPostEntries } from "../scripts/build-github";
import {
	compareUrlMultisets,
	decodeXmlText,
	EXPECTED_SITEMAP_LOC_COUNT,
	evaluatePostSeo,
	expectedSitemapLocs,
	extractCanonicalHrefs,
	extractHtmlLang,
	extractMetaRefreshTargets,
	extractReplaceTargets,
	extractSitemapLocs,
	FORBIDDEN_KO_PATHS,
	findLegacyAliasLocs,
	isKoTreeUrl,
	isKrUrl,
	isSameOriginUrl,
	normalizeLocation,
	PRODUCTION_ORIGIN,
	parseCliArgs,
	postCanonicalUrl,
	postHashFragment,
	postHashTarget,
	postLandingPath,
	REQUIRED_ROOT_PATHS,
	resolveSitemapExpectation,
	UNKNOWN_PATH,
} from "../scripts/verify-production.mjs";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

function escapedXmlLoc(loc: string) {
	return `<loc>${loc
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")}</loc>`;
}

function featureScenarios(feature: string) {
	return [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map((match) =>
		match[1].trim(),
	);
}

describe("production acceptance feature contract", () => {
	const feature = read("tests/features/production-acceptance.feature");

	test("Given feature 파일 When 시나리오 카탈로그 Then 3개 시나리오가 유지된다", () => {
		expect(featureScenarios(feature)).toEqual([
			"Production HTTP contract holds for landings, aliases, sitemap, and forbidden paths",
			"Korean posts are observed through real browser requests",
			"SPA head SEO is an opt-in flag until the head fix deploys",
		]);
	});

	test("Given feature 파일 When 구조 검증 Then 각 시나리오는 Given/When/Then 흐름을 가진다", () => {
		const blocks = feature
			.split(/\r?\n(?=\s*Scenario:)/)
			.filter((block) => block.includes("Scenario:"));
		expect(blocks).toHaveLength(3);
		for (const block of blocks) {
			expect(block).toContain("Given ");
			expect(block).toContain("When ");
			expect(block).toContain("Then ");
		}
	});
});

describe("URL 계약 헬퍼", () => {
	test("Given slug When landing/canonical/hash 생성 Then locale prefix가 계약과 일치한다", () => {
		expect(postLandingPath("ko", "some-slug")).toBe("/ko/post/some-slug/");
		expect(postLandingPath("en", "some-slug")).toBe("/post/some-slug/");
		expect(postCanonicalUrl("ko", "some-slug")).toBe(
			"https://wintrover.github.io/ko/post/some-slug/",
		);
		expect(postCanonicalUrl("en", "some-slug")).toBe(
			"https://wintrover.github.io/post/some-slug/",
		);
		expect(postHashTarget("ko", "some-slug")).toBe("/ko/#/post/some-slug");
		expect(postHashTarget("en", "some-slug")).toBe("/#/post/some-slug");
		expect(postHashFragment("some-slug")).toBe("#/post/some-slug");
	});

	test("Given 잘못된 locale When URL 생성 Then fail-closed로 throw한다", () => {
		expect(() => postLandingPath("kr" as never, "some-slug")).toThrow(
			"unsupported locale: kr",
		);
		expect(() => postCanonicalUrl("en-US" as never, "some-slug")).toThrow(
			"unsupported locale: en-US",
		);
	});

	test("Given prod sitemap When loc multiset 생성 Then 루트 4개 + KO/EN 포스트로 고정된다", () => {
		const locs = expectedSitemapLocs({
			koSlugs: ["ko-b", "ko-a"],
			enSlugs: ["en-b"],
		});
		expect(locs).toEqual([
			`${PRODUCTION_ORIGIN}/`,
			`${PRODUCTION_ORIGIN}/ko/`,
			`${PRODUCTION_ORIGIN}/resume/`,
			`${PRODUCTION_ORIGIN}/ko/resume/`,
			`${PRODUCTION_ORIGIN}/ko/post/ko-b/`,
			`${PRODUCTION_ORIGIN}/ko/post/ko-a/`,
			`${PRODUCTION_ORIGIN}/post/en-b/`,
		]);
	});
});

describe("sitemap loc 추출과 다중집합 비교", () => {
	test("Given sitemap XML When loc 추출 Then XML entity가 복원된다", () => {
		const xml = [
			"<urlset>",
			escapedXmlLoc("https://wintrover.github.io/?a=1&b=2"),
			escapedXmlLoc("https://wintrover.github.io/ko/"),
			"</urlset>",
		].join("");
		expect(extractSitemapLocs(xml)).toEqual([
			"https://wintrover.github.io/?a=1&b=2",
			"https://wintrover.github.io/ko/",
		]);
		expect(decodeXmlText("&lt;a&gt;&quot;b&quot;&apos;c&apos;&amp;")).toBe(
			"<a>\"b\"'c'&",
		);
	});

	test("Given loc이 없는 sitemap When 추출 Then 빈 배열을 반환한다", () => {
		expect(extractSitemapLocs("<urlset></urlset>")).toEqual([]);
	});

	test("Given 동일한 다중집합 When 비교 Then ok이고 차이가 보고되지 않는다", () => {
		const result = compareUrlMultisets(["a", "b", "a"], ["a", "a", "b"]);
		expect(result.ok).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.unexpected).toEqual([]);
		expect(result.actualCount).toBe(3);
		expect(result.expectedCount).toBe(3);
	});

	test("Given 누락/추가/중복 When 비교 Then 각 차이가 정렬되어 보고된다", () => {
		const result = compareUrlMultisets(["a", "c", "c"], ["a", "b"]);
		expect(result.ok).toBe(false);
		expect(result.missing).toEqual(["b"]);
		expect(result.unexpected).toEqual(["c", "c"]);
		expect(result.duplicateActual).toEqual(["c"]);
		expect(result.duplicateExpected).toEqual([]);
	});

	test("Given dist sitemap이 존재 When 기대 집합 해석 Then dist를 우선한다", () => {
		expect(
			resolveSitemapExpectation({ localLocs: ["dist"], sourceLocs: ["src"] }),
		).toEqual({ locs: ["dist"], source: "dist" });
		expect(
			resolveSitemapExpectation({ localLocs: null, sourceLocs: ["src"] }),
		).toEqual({ locs: ["src"], source: "source" });
	});

	test("Given 저장소 posts When 기대 sitemap loc 생성 Then 62개이며 중복이 없다", () => {
		expect(EXPECTED_SITEMAP_LOC_COUNT).toBe(62);
		const locs = expectedSitemapLocs({
			koSlugs: collectPostEntries(root, "ko").map((entry) => entry.slug),
			enSlugs: collectPostEntries(root, "en").map((entry) => entry.slug),
		});
		expect(locs).toHaveLength(EXPECTED_SITEMAP_LOC_COUNT);
		expect(new Set(locs).size).toBe(locs.length);
	});

	test("Given /kr 및 legacy alias When sitemap loc 필터 Then 제거 대상만 잡힌다", () => {
		const locs = [
			`${PRODUCTION_ORIGIN}/`,
			`${PRODUCTION_ORIGIN}/kr/`,
			`${PRODUCTION_ORIGIN}/kr`,
			`${PRODUCTION_ORIGIN}/post/old-slug/`,
			`${PRODUCTION_ORIGIN}/post/current-slug/`,
		];
		expect(locs.filter(isKrUrl)).toEqual([
			`${PRODUCTION_ORIGIN}/kr/`,
			`${PRODUCTION_ORIGIN}/kr`,
		]);
		expect(
			findLegacyAliasLocs(locs, [{ from: "old-slug", to: "current-slug" }]),
		).toEqual([`${PRODUCTION_ORIGIN}/post/old-slug/`]);
		expect(findLegacyAliasLocs(locs, [])).toEqual([]);
	});
});

describe("정적 HTML 추출", () => {
	const landing = [
		'<!doctype html><html lang="ko" prefix="og: https://ogp.me/ns#">',
		'<link rel="canonical" href="https://wintrover.github.io/ko/post/some-slug/"/>',
		'<link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/post/some-slug/"/>',
		'<script>(()=>{location.replace("/ko/#/post/some-slug");})();</script>',
		"</html>",
	].join("");

	test("Given landing HTML When lang/canonical/redirect 추출 Then 정확히 하나씩 나온다", () => {
		expect(extractHtmlLang(landing)).toBe("ko");
		expect(extractCanonicalHrefs(landing)).toEqual([
			"https://wintrover.github.io/ko/post/some-slug/",
		]);
		expect(extractReplaceTargets(landing)).toEqual(["/ko/#/post/some-slug"]);
	});

	test("Given canonical이 없는 HTML When 추출 Then 빈 배열이다", () => {
		expect(extractHtmlLang("<html><head></head></html>")).toBeNull();
		expect(extractCanonicalHrefs("<html><head></head></html>")).toEqual([]);
		expect(extractReplaceTargets("<html></html>")).toEqual([]);
	});

	test("Given /kr 별칭 HTML When refresh 추출 Then /ko/가 나온다", () => {
		const html =
			'<html lang="ko"><link rel="canonical" href="https://wintrover.github.io/ko/"/>' +
			'<meta http-equiv="refresh" content="0; url=/ko/"/></html>';
		expect(extractCanonicalHrefs(html)).toEqual([
			"https://wintrover.github.io/ko/",
		]);
		expect(extractMetaRefreshTargets(html)).toEqual(["/ko/"]);
		expect(extractMetaRefreshTargets("<html></html>")).toEqual([]);
	});
});

describe("브라우저 요청 귀속", () => {
	test("Given URL When same-origin 및 /ko 트리 판정 Then origin/prefix 기준으로 나뉜다", () => {
		expect(isSameOriginUrl(`${PRODUCTION_ORIGIN}/ko/`)).toBe(true);
		expect(isSameOriginUrl("https://github.com/Archright/Axiom")).toBe(false);
		expect(isSameOriginUrl("not a url")).toBe(false);
		expect(isKoTreeUrl(`${PRODUCTION_ORIGIN}/ko/`)).toBe(true);
		expect(isKoTreeUrl(`${PRODUCTION_ORIGIN}/ko`)).toBe(true);
		expect(isKoTreeUrl(`${PRODUCTION_ORIGIN}/ko/post/x/`)).toBe(true);
		expect(isKoTreeUrl(`${PRODUCTION_ORIGIN}/koala.png`)).toBe(false);
		expect(isKoTreeUrl("https://github.com/ko/post/x/")).toBe(false);
		expect(isKoTreeUrl("garbage")).toBe(false);
	});

	test("Given redirect location When 정규화 Then path+search+hash만 남는다", () => {
		expect(normalizeLocation(`${PRODUCTION_ORIGIN}/kr/`)).toBe("/kr/");
		expect(normalizeLocation("/kr/")).toBe("/kr/");
		expect(normalizeLocation("https://example.com/kr/")).toBe(
			"https://example.com/kr/",
		);
		expect(normalizeLocation(null)).toBe("");
	});

	test("Given 금지/필수 경로 목록 When 계약 확인 Then KO 경계와 루트 자산이 고정된다", () => {
		expect(FORBIDDEN_KO_PATHS).toEqual([
			"/ko/evidence/",
			"/ko/404.html",
			"/ko/.nojekyll",
			"/ko/auto-merge-verification.txt",
			"/ko/sitemap.xml",
			"/ko/robots.txt",
		]);
		expect(REQUIRED_ROOT_PATHS).toEqual([
			"/evidence/p0d2g/README.md",
			"/404.html",
			"/.nojekyll",
			"/auto-merge-verification.txt",
			"/images/profile.png",
			"/kr/",
		]);
		expect(UNKNOWN_PATH).toBe("/definitely-not-a-real-path-xyz/");
	});
});

describe("CLI 플래그", () => {
	test("Given 인자 없음 When 파싱 Then spa SEO는 기본 비활성이다", () => {
		expect(parseCliArgs([])).toEqual({ includeSpaSeo: false, unknown: [] });
	});

	test("Given --include-spa-seo When 파싱 Then spa SEO만 활성화된다", () => {
		expect(parseCliArgs(["--include-spa-seo"])).toEqual({
			includeSpaSeo: true,
			unknown: [],
		});
	});

	test("Given 알 수 없는 인자 When 파싱 Then 보고 대상으로 수집된다", () => {
		expect(parseCliArgs(["--bogus", "--include-spa-seo"])).toEqual({
			includeSpaSeo: true,
			unknown: ["--bogus"],
		});
	});
});

describe("SPA head SEO 판정", () => {
	const expectedCanonical = "https://wintrover.github.io/ko/post/some-slug/";

	test("Given canonical 1개와 일치하는 title When 판정 Then 문제가 없다", () => {
		expect(
			evaluatePostSeo({
				canonicals: [expectedCanonical],
				documentTitle: "포스트 제목",
				expectedCanonical,
				expectedTitle: "포스트 제목",
			}),
		).toEqual([]);
	});

	test("Given canonical 2개 When 판정 Then 개수 위반으로 실패한다", () => {
		const problems = evaluatePostSeo({
			canonicals: [expectedCanonical, `${PRODUCTION_ORIGIN}/`],
			documentTitle: "포스트 제목",
			expectedCanonical,
			expectedTitle: "포스트 제목",
		});
		expect(problems).toEqual(["canonical count=2 (expected 1)"]);
	});

	test("Given stale title When 판정 Then title 불일치로 실패한다", () => {
		const problems = evaluatePostSeo({
			canonicals: [expectedCanonical],
			documentTitle: "Axiom",
			expectedCanonical,
			expectedTitle: "포스트 제목",
		});
		expect(problems).toEqual([
			'document.title="Axiom" (expected "포스트 제목")',
		]);
	});

	test("Given canonical이 다른 URL When 판정 Then canonical 불일치로 실패한다", () => {
		const problems = evaluatePostSeo({
			canonicals: [`${PRODUCTION_ORIGIN}/`],
			documentTitle: "포스트 제목",
			expectedCanonical,
			expectedTitle: "포스트 제목",
		});
		expect(problems).toEqual([
			"canonical=https://wintrover.github.io/ (expected https://wintrover.github.io/ko/post/some-slug/)",
		]);
	});
});

describe("독립성 규칙", () => {
	const script = read("scripts/verify-production.mjs");

	test("Given 검증 스크립트 When 소스 확인 Then deriveKoPublicAssets를 사용하지 않는다", () => {
		expect(script).not.toContain("deriveKoPublicAssets");
	});

	test("Given 검증 스크립트 When 관리 Chrome 경로 확인 Then 하드코딩된 브라우저 경로가 없다", () => {
		expect(script).not.toMatch(/\/usr\/bin\/google-chrome/);
		expect(script).not.toMatch(/executablePath/);
	});

	test("Given 검증 스크립트 When 실행 경로 확인 Then 고정 타임아웃과 finally 종료를 가진다", () => {
		expect(script).toContain("REQUEST_TIMEOUT_MS = 30_000");
		expect(script).toContain("BROWSER_TIMEOUT_MS");
		expect(script).toContain("browser.close()");
		expect(script).toContain("RESULT checks=");
	});

	test("Given package.json When 스크립트 확인 Then verify:production이 등록되어 있다", () => {
		const pkg = JSON.parse(read("package.json")) as {
			scripts: Record<string, string>;
		};
		expect(pkg.scripts["verify:production"]).toBe(
			"node scripts/verify-production.mjs",
		);
	});
});
