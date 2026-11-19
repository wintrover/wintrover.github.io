import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { collectPostEntries } from "../scripts/build-github";
import {
	buildRepositoryContract,
	categoryHashTarget,
	categoryTagHashTarget,
	compareUrlMultisets,
	decodeXmlText,
	EXPECTED_SITEMAP_LOC_COUNT,
	evaluateCategorySeo,
	evaluateInitialNotFoundResponse,
	evaluateKrAliasDocument,
	evaluatePostSeo,
	evaluateSpaNotFoundDocument,
	expectedSitemapLocs,
	extractCanonicalHrefs,
	extractHtmlLang,
	extractMetaRefreshContents,
	extractMetaRefreshTargets,
	extractReplaceTargets,
	extractRobotsContents,
	extractSitemapLocs,
	FORBIDDEN_KO_PATHS,
	findAliasEntries,
	findLegacyAliasLocs,
	isKoTreeUrl,
	isKrUrl,
	isSameOriginUrl,
	isZeroSecondRefreshContent,
	normalizeLocation,
	PRODUCTION_ORIGIN,
	parseCliArgs,
	parseUrlContract,
	pickCategoryTagSample,
	postCanonicalUrl,
	postHashFragment,
	postHashTarget,
	postLandingPath,
	REQUIRED_ROOT_PATHS,
	resolveSitemapExpectation,
	resolveSitemapPlan,
	robotsAllowsIndexing,
	robotsBlocksIndexing,
	slugifyUrlSegment,
	UNKNOWN_PATH,
} from "../scripts/verify-production.mjs";
import { slugify } from "../src/lib/utils";

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

describe("production acceptance repository wiring", () => {
	test("Given build-github 모듈 When 계약 도출 Then LEGACY_POST_ALIASES 없이 post entry만 도출한다", () => {
		const module = {
			collectPostEntries: (_root: string, locale: string) => [
				{ slug: `${locale}-slug`, title: `${locale} title` },
			],
		};
		const contract = buildRepositoryContract(module, root);
		expect(contract).toEqual({
			koEntries: [{ slug: "ko-slug", title: "ko title" }],
			enEntries: [{ slug: "en-slug", title: "en title" }],
			aliases: [],
		});
		expect(read("scripts/verify-production.mjs")).not.toContain(
			"LEGACY_POST_ALIASES",
		);
	});
});

describe("production acceptance feature contract", () => {
	const feature = read("tests/features/production-acceptance.feature");

	test("Given feature 파일 When 시나리오 카탈로그 Then 7개 시나리오가 유지된다", () => {
		expect(featureScenarios(feature)).toEqual([
			"Production HTTP contract holds for landings, aliases, sitemap, and forbidden paths",
			"Korean posts are observed through real browser requests",
			"SPA head SEO is an opt-in flag",
			"Sitemap expectation follows url-contract.json when present",
			"Registry kinds separate canonical and alias expectations",
			"Legacy /kr and unknown paths are judged stage by stage",
			"SPA head SEO covers category and tag routes",
		]);
	});

	test("Given feature 파일 When 구조 검증 Then 각 시나리오는 Given/When/Then 흐름을 가진다", () => {
		const blocks = feature
			.split(/\r?\n(?=\s*Scenario:)/)
			.filter((block) => block.includes("Scenario:"));
		expect(blocks).toHaveLength(7);
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

describe("url-contract 기대 집합", () => {
	test("Given canonical 배열 When 파싱 Then host를 제거한 root-relative 집합이 된다", () => {
		expect(
			parseUrlContract([
				"https://wintrover.github.io/",
				"/ko/",
				{ url: "https://wintrover.github.io/post/a/" },
				{ loc: "/resume/" },
			]),
		).toEqual({
			canonical: ["/", "/ko/", "/post/a/", "/resume/"],
			aliases: [],
		});
	});

	test("Given canonical+aliases 객체 When 파싱 Then alias가 경로로 정규화된다", () => {
		expect(
			parseUrlContract({
				canonical: ["/", "/ko/"],
				aliases: [
					{ from: "/post/old/", to: "/post/new/" },
					"legacy-slug",
					{ from: "https://wintrover.github.io/kr/" },
				],
			}),
		).toEqual({
			canonical: ["/", "/ko/"],
			aliases: [
				{ from: "/post/old/", to: "/post/new/" },
				{ from: "/post/legacy-slug/", to: null },
				{ from: "/kr/", to: null },
			],
		});
	});

	test("Given 저장소 registry 형태 When 파싱 Then kind로 canonical과 alias를 분리한다", () => {
		expect(
			parseUrlContract({
				version: 1,
				urls: [
					{ url: "/", kind: "canonical", locale: "en" },
					{ url: "/ko/", kind: "canonical", locale: "ko" },
					{ url: "/kr/", kind: "alias", target: "/ko/", evidence: "e" },
					{ url: "/post/old/", kind: "alias", target: "/post/new/" },
				],
			}),
		).toEqual({
			canonical: ["/", "/ko/"],
			aliases: [
				{ from: "/kr/", to: "/ko/" },
				{ from: "/post/old/", to: "/post/new/" },
			],
		});
	});

	test("Given 알 수 없는 kind When 파싱 Then fail-closed로 throw한다", () => {
		expect(() =>
			parseUrlContract({ urls: [{ url: "/", kind: "legacy" }] }),
		).toThrow("unknown kind");
	});

	test("Given 잘못된 contract When 파싱 Then fail-closed로 throw한다", () => {
		expect(() => parseUrlContract({})).toThrow(
			"canonical URL array is missing",
		);
		expect(() => parseUrlContract({ canonical: [42] })).toThrow(
			"invalid canonical entry",
		);
		expect(() =>
			parseUrlContract({ canonical: ["/"], aliases: "nope" }),
		).toThrow("aliases must be an array");
		expect(() => parseUrlContract("{")).toThrow();
	});

	test("Given contract/dist/source When 기대 집합 해석 Then 우선순위가 고정된다", () => {
		expect(
			resolveSitemapPlan({
				contractLocs: ["/c"],
				localLocs: ["/d"],
				sourceLocs: ["/s"],
			}),
		).toEqual({ locs: ["/c"], source: "url-contract" });
		expect(
			resolveSitemapPlan({
				contractLocs: null,
				localLocs: ["/d"],
				sourceLocs: ["/s"],
			}),
		).toEqual({ locs: ["/d"], source: "dist" });
		expect(
			resolveSitemapPlan({
				contractLocs: null,
				localLocs: null,
				sourceLocs: ["/s"],
			}),
		).toEqual({ locs: ["/s"], source: "source" });
	});

	test("Given alias 경로 When sitemap 항목 필터 Then 슬래시 변형까지 잡는다", () => {
		expect(
			findAliasEntries(
				["/", "/post/old/", "/post/old", "/post/new/"],
				["/post/old/"],
			),
		).toEqual(["/post/old", "/post/old/"]);
		expect(findAliasEntries(["/"], [])).toEqual([]);
	});
});

describe("/kr 별칭 문서 판정", () => {
	const html = [
		'<html lang="ko"><head>',
		'<link rel="canonical" href="https://wintrover.github.io/ko/"/>',
		'<meta http-equiv="refresh" content="0; url=/ko/"/>',
		'<meta name="robots" content="noindex,follow"/>',
		"</head></html>",
	].join("");

	test("Given 계약을 만족하는 /kr/ HTML When 판정 Then 문제가 없다", () => {
		expect(evaluateKrAliasDocument({ status: 200, html })).toEqual([]);
		expect(extractMetaRefreshContents(html)).toEqual(["0; url=/ko/"]);
		expect(isZeroSecondRefreshContent("0; url=/ko/")).toBe(true);
		expect(isZeroSecondRefreshContent("1; url=/ko/")).toBe(false);
		expect(extractRobotsContents(html)).toEqual(["noindex,follow"]);
		expect(robotsBlocksIndexing(["noindex,follow"])).toBe(true);
		expect(robotsBlocksIndexing(["noindex nofollow"])).toBe(true);
		expect(robotsAllowsIndexing(["index,follow"])).toBe(true);
	});

	test("Given refresh가 다르거나 robots가 없으면 When 판정 Then 실패한다", () => {
		const shifted = html.replace("0; url=/ko/", "1; url=/ko/");
		expect(
			evaluateKrAliasDocument({ status: 200, html: shifted }).join("; "),
		).toContain("refresh=");
		const noRobots = html.replace(
			'<meta name="robots" content="noindex,follow"/>',
			"",
		);
		expect(
			evaluateKrAliasDocument({ status: 200, html: noRobots }).join("; "),
		).toContain("robots=[] expected noindex directive");
		expect(evaluateKrAliasDocument({ status: 301, html }).join("; ")).toContain(
			"status=301 expected=200",
		);
	});
});

describe("404 3단계 판정", () => {
	const initialHtml =
		'<html><head><meta name="robots" content="noindex,nofollow"/></head></html>';

	test("Given 404 응답 HTML When 1단계 판정 Then noindex,nofollow와 canonical/Location 부재를 요구한다", () => {
		expect(
			evaluateInitialNotFoundResponse({
				status: 404,
				html: initialHtml,
				location: null,
			}),
		).toEqual([]);
		const problems = evaluateInitialNotFoundResponse({
			status: 200,
			html: '<link rel="canonical" href="https://wintrover.github.io/"/>',
			location: "/somewhere/",
		});
		expect(problems).toEqual([
			"status=200 expected=404",
			"robots=[] expected noindex,nofollow",
			'canonical=["https://wintrover.github.io/"] expected none',
			'location="/somewhere/" expected none',
		]);
	});

	test("Given SPA NotFound DOM When 3단계 판정 Then 로케일 루트 canonical과 index robots를 요구한다", () => {
		expect(
			evaluateSpaNotFoundDocument({
				locale: "ko",
				canonicals: [`${PRODUCTION_ORIGIN}/ko/`],
				documentTitle: "페이지를 찾을 수 없습니다",
				robots: ["index,follow,max-image-preview:large"],
				jsonLdCount: 0,
			}),
		).toEqual([]);
		const problems = evaluateSpaNotFoundDocument({
			locale: "en",
			canonicals: [`${PRODUCTION_ORIGIN}/`, `${PRODUCTION_ORIGIN}/`],
			documentTitle: "Axiom",
			robots: ["noindex,nofollow"],
			jsonLdCount: 1,
		});
		expect(problems).toContain("canonical count=2 (expected 1)");
		expect(problems).toContain(
			'document.title="Axiom" expected="Page not found"',
		);
		expect(problems).toContain(
			'robots=["noindex,nofollow"] expected index,follow without noindex',
		);
		expect(problems).toContain("json-ld count=1 expected=0");
		expect(
			evaluateSpaNotFoundDocument({
				locale: "en",
				canonicals: [`${PRODUCTION_ORIGIN}/`],
				documentTitle: "Page not found",
				robots: [],
				jsonLdCount: 0,
			}),
		).toEqual(["robots=[] expected index,follow"]);
	});
});

describe("category/tag 표본과 SPA head 판정", () => {
	test("Given frontmatter 항목 When 표본 파생 Then slug 순서로 결정된다", () => {
		expect(
			pickCategoryTagSample([
				{ slug: "z", category: "Tutorial", tags: [] },
				{
					slug: "a",
					category: "Company Work",
					tags: ["SMBholdings", "CVFactory"],
				},
				{ slug: "b", category: "Archright", tags: ["Axiom"] },
			]),
		).toEqual({
			category: "Company Work",
			categorySlug: "company-work",
			tag: "CVFactory",
			tagSlug: "cvfactory",
		});
		expect(
			pickCategoryTagSample([{ slug: "a", category: "Tutorial", tags: [] }]),
		).toBeNull();
		expect(pickCategoryTagSample([])).toBeNull();
	});

	test("Given category/tag 값 When slug 변환 Then 앱 slugify와 동일하다", () => {
		for (const value of [
			"Company Work",
			"Archright",
			"CVFactory",
			"Axiom",
			"Quality-Gate",
			"정형 검증",
		]) {
			expect(slugifyUrlSegment(value)).toBe(slugify(value));
		}
		expect(categoryHashTarget("ko", "company-work")).toBe(
			"/ko/#/category/company-work",
		);
		expect(categoryTagHashTarget("en", "company-work", "cvfactory")).toBe(
			"/#/category/company-work/tag/cvfactory",
		);
	});

	test("Given category 경로 DOM When SEO 판정 Then 로케일 루트 canonical과 라벨 title을 요구한다", () => {
		expect(
			evaluateCategorySeo({
				locale: "ko",
				canonicals: [`${PRODUCTION_ORIGIN}/ko/`],
				documentTitle: "Company Work",
				expectedTitle: "Company Work",
			}),
		).toEqual([]);
		const problems = evaluateCategorySeo({
			locale: "en",
			canonicals: [`${PRODUCTION_ORIGIN}/#/category/company-work`],
			documentTitle: "",
			expectedTitle: "Company Work",
		});
		expect(problems).toContain(
			"canonical contains hash: https://wintrover.github.io/#/category/company-work",
		);
		expect(problems).toContain(
			'canonical="https://wintrover.github.io/#/category/company-work" expected="https://wintrover.github.io/"',
		);
		expect(problems).toContain("document.title is empty");
		expect(
			evaluateCategorySeo({
				locale: "ko",
				canonicals: [`${PRODUCTION_ORIGIN}/ko/`, `${PRODUCTION_ORIGIN}/ko/`],
				documentTitle: "Company Work #cvfactory",
				expectedTitle: "Company Work #cvfactory",
			}),
		).toEqual(["canonical count=2 (expected 1)"]);
	});
});
