import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	getBlogBuildMeta,
	getNotFoundCopy,
	getRuntimeOrigin,
} from "../src/lib/config";
import type { Post } from "../src/lib/postLoader";
import {
	applyBlogListSeo,
	applyHomeSeo,
	applyNotFoundSeo,
	applyPostSeo,
	applyResumeSeo,
} from "../src/lib/seo";

const shellHead = [
	"<title>Axiom - Integrity Proof Engineer</title>",
	'<meta name="description" content="shell description" />',
	'<link rel="canonical" href="https://wintrover.github.io/" />',
	'<link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/" />',
	'<link rel="alternate" hreflang="en" href="https://wintrover.github.io/" />',
	'<link rel="alternate" hreflang="x-default" href="https://wintrover.github.io/" />',
	'<meta property="og:title" content="shell og title" />',
	'<meta property="og:description" content="shell og description" />',
	'<meta property="og:type" content="website" />',
	'<meta property="og:url" content="https://wintrover.github.io/" />',
	'<meta property="og:image" content="https://wintrover.github.io/images/profile.png" />',
	'<meta property="og:image:alt" content="shell alt" />',
	'<meta property="og:site_name" content="wintrover" />',
].join("");

const mockPost: Post = {
	fileName: "detailed-post",
	title: "Detailed Post",
	slug: "detailed-post",
	category: "Tech",
	date: "2023-10-01",
	content: "Body content",
	html: "<p>Body content</p>",
	excerpt: "Detailed excerpt",
	tags: ["svelte", "testing"],
};

function canonicalLinks() {
	return [
		...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
	];
}

function canonicalHrefs() {
	return canonicalLinks().map((link) => link.getAttribute("href"));
}

function structuredDataScripts() {
	return [
		...document.querySelectorAll(
			'script[type="application/ld+json"][data-seo-owner="spa"]',
		),
	];
}

function expectSingleCanonical(expectedHref: string) {
	const links = canonicalLinks();
	expect(links).toHaveLength(1);
	expect(links[0]?.getAttribute("href")).toBe(expectedHref);
}

describe("SPA head identity controller", () => {
	beforeEach(() => {
		document.head.innerHTML = shellHead;
	});

	afterEach(() => {
		window.history.replaceState({}, "", "/");
	});

	test("포스트 라우트는 정확히 1개의 canonical과 포스트 제목으로 수렴해야 함", () => {
		applyPostSeo({
			post: mockPost,
			loading: false,
			slug: "detailed-post",
			resolvedLocale: "ko",
		});

		const origin = getRuntimeOrigin();
		expect(document.title).toBe("Detailed Post");
		expect(document.querySelectorAll("title")).toHaveLength(1);
		expectSingleCanonical(`${origin}/ko/post/detailed-post/`);
		expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(
			1,
		);
		expect(
			document
				.querySelector('meta[name="description"]')
				?.getAttribute("content"),
		).toBe("Detailed excerpt");
		expect(
			document
				.querySelector('meta[property="og:type"]')
				?.getAttribute("content"),
		).toBe("article");
		expect(
			document
				.querySelector('meta[property="og:url"]')
				?.getAttribute("content"),
		).toBe(`${origin}/ko/post/detailed-post/`);
		expect(structuredDataScripts()).toHaveLength(1);
	});

	test("home과 resume 라우트는 이전 포스트 head 값을 초기화해야 함", () => {
		const origin = getRuntimeOrigin();
		applyPostSeo({
			post: mockPost,
			loading: false,
			slug: "detailed-post",
			resolvedLocale: "en",
		});

		applyHomeSeo("en");
		expect(document.title).toBe(getBlogBuildMeta("en").ogTitle);
		expectSingleCanonical(`${origin}/`);
		expect(structuredDataScripts()).toHaveLength(0);
		expect(document.querySelectorAll('meta[name="keywords"]')).toHaveLength(0);

		applyResumeSeo({
			canonical: `${origin}/ko/resume/`,
			title: "resume",
			description: "resume description",
			keywords: "resume, integrity",
			ogTitle: "resume",
			ogDescription: "resume description",
			ogType: "website",
			imageAlt: "profile",
		});
		expect(document.title).toBe("resume");
		expectSingleCanonical(`${origin}/ko/resume/`);
		expect(document.querySelectorAll('meta[name="keywords"]')).toHaveLength(1);
		expect(
			document.querySelector('meta[name="keywords"]')?.getAttribute("content"),
		).toBe("resume, integrity");

		applyHomeSeo("ko");
		expect(document.title).toBe(getBlogBuildMeta("ko").ogTitle);
		expectSingleCanonical(`${origin}/ko/`);
		expect(document.querySelectorAll('meta[name="keywords"]')).toHaveLength(0);
	});

	test("카테고리·태그 뷰 canonical은 fragment 없는 로케일 루트여야 함", () => {
		const origin = getRuntimeOrigin();
		window.location.hash = "#/category/Project/tag/CVFactory";

		const cases = [
			{ resolvedLocale: "en" as const, expected: `${origin}/` },
			{ resolvedLocale: "ko" as const, expected: `${origin}/ko/` },
		];

		for (const { resolvedLocale, expected } of cases) {
			applyBlogListSeo({
				title: "Project #CVFactory",
				description: "Posts in Project #CVFactory.",
				resolvedLocale,
			});

			expectSingleCanonical(expected);
			expect(canonicalHrefs()[0]).not.toContain("#");
		}
	});

	test("카테고리 없는 블로그 리스트 canonical도 로케일 루트여야 함", () => {
		const origin = getRuntimeOrigin();
		const meta = getBlogBuildMeta("ko");
		window.location.hash = "#/";

		applyBlogListSeo({
			title: meta.ogTitle,
			description: meta.metaDescription,
			resolvedLocale: "ko",
		});

		expectSingleCanonical(`${origin}/ko/`);
		expect(canonicalHrefs()[0]).not.toContain("#");
	});

	test("unknown 라우트는 NotFound 제목과 locale 루트 canonical로 복귀해야 함", () => {
		const origin = getRuntimeOrigin();
		applyPostSeo({
			post: mockPost,
			loading: false,
			slug: "detailed-post",
			resolvedLocale: "ko",
		});

		applyNotFoundSeo("ko");

		expect(document.title).toBe(
			getNotFoundCopy({ scope: "page", resolvedLocale: "ko" }).title,
		);
		expectSingleCanonical(`${origin}/ko/`);
		expect(structuredDataScripts()).toHaveLength(0);
	});

	test("home → post → category → tag → resume → unknown 전환에서 canonical은 항상 1개여야 함", () => {
		const origin = getRuntimeOrigin();
		window.location.hash = "#/category/Project";
		const steps: { apply: () => void; title: string; canonical: string }[] = [
			{
				apply: () => applyHomeSeo("ko"),
				title: getBlogBuildMeta("ko").ogTitle,
				canonical: `${origin}/ko/`,
			},
			{
				apply: () =>
					applyPostSeo({
						post: mockPost,
						loading: false,
						slug: "detailed-post",
						resolvedLocale: "ko",
					}),
				title: "Detailed Post",
				canonical: `${origin}/ko/post/detailed-post/`,
			},
			{
				apply: () => applyHomeSeo("ko"),
				title: getBlogBuildMeta("ko").ogTitle,
				canonical: `${origin}/ko/`,
			},
			{
				apply: () =>
					applyResumeSeo({
						canonical: `${origin}/ko/resume/`,
						title: "resume",
						description: "resume description",
						keywords: "resume",
						ogTitle: "resume",
						ogDescription: "resume description",
						ogType: "website",
						imageAlt: "profile",
					}),
				title: "resume",
				canonical: `${origin}/ko/resume/`,
			},
			{
				apply: () =>
					applyBlogListSeo({
						title: "Project",
						description: "Posts in Project.",
						resolvedLocale: "ko",
					}),
				title: "Project",
				canonical: `${origin}/ko/`,
			},
			{
				apply: () =>
					applyBlogListSeo({
						title: "Project #CVFactory",
						description: "Posts in Project #CVFactory.",
						resolvedLocale: "ko",
					}),
				title: "Project #CVFactory",
				canonical: `${origin}/ko/`,
			},
			{
				apply: () => applyNotFoundSeo("ko"),
				title: getNotFoundCopy({ scope: "page", resolvedLocale: "ko" }).title,
				canonical: `${origin}/ko/`,
			},
		];

		for (const step of steps) {
			step.apply();
			expect(document.title).toBe(step.title);
			expectSingleCanonical(step.canonical);
			expect(canonicalHrefs()[0]).not.toContain("#");
		}
	});

	test("기존 canonical 중복은 단일 링크로 수렴해야 함", () => {
		document.head.insertAdjacentHTML(
			"beforeend",
			'<link rel="canonical" href="https://example.com/duplicate" />',
		);
		expect(canonicalLinks()).toHaveLength(2);

		applyHomeSeo("en");

		expectSingleCanonical(`${getRuntimeOrigin()}/`);
	});

	test("PBT: 임의 slug에 대해 포스트 canonical은 항상 1개여야 함", () => {
		const origin = getRuntimeOrigin();
		fc.assert(
			fc.property(
				fc.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789-".split(""),
					),
					minLength: 1,
					maxLength: 32,
				}),
				(slug) => {
					applyPostSeo({
						post: { ...mockPost, slug },
						loading: false,
						slug,
						resolvedLocale: "en",
					});

					expect(canonicalHrefs()).toEqual([`${origin}/post/${slug}/`]);
					expect(document.querySelectorAll("title")).toHaveLength(1);
					expect(document.title).toBe(mockPost.title);
				},
			),
		);
	});
});
