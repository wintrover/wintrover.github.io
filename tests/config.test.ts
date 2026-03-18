import { describe, expect, test } from "vitest";
import {
	blogDefaultSeo,
	buildBlogListSeoUrl,
	buildPostDetailSeo,
	getBlogBuildMeta,
} from "../src/lib/config";
import type { Post } from "../src/lib/postLoader";

describe("buildPostDetailSeo", () => {
	const mockPost: Post = {
		fileName: "detailed-post",
		title: "Detailed Post",
		slug: "detailed-post",
		category: "Tech",
		date: "2023-10-01",
		content: "Body content",
		html: "<h1>Header</h1><p>Body content</p>",
		excerpt: "Detailed excerpt",
		tags: ["svelte", "testing"],
	};

	test("post가 있으면 article SEO를 반환해야 함", () => {
		const seo = buildPostDetailSeo({
			post: mockPost,
			loading: false,
			slug: "detailed-post",
			resolvedLocale: "en",
		});

		expect(seo.seoTitle).toBe("Detailed Post - wintrover");
		expect(seo.seoDescription).toBe("Detailed excerpt");
		expect(seo.canonicalUrl).toContain("/post/detailed-post/");
		expect(seo.structuredData).toContain('"@type":"BlogPosting"');
	});

	test("post가 없고 로딩이 끝나면 not found SEO를 반환해야 함", () => {
		const seo = buildPostDetailSeo({
			post: null,
			loading: false,
			slug: "missing",
			resolvedLocale: "ko",
		});

		expect(seo.seoTitle).toBe("Post not found - wintrover");
		expect(seo.seoDescription).toContain("doesn't exist");
		expect(seo.canonicalUrl).toContain("/ko/");
		expect(seo.structuredData).toBe("");
	});

	test("post가 없고 로딩 중이면 loading SEO를 반환해야 함", () => {
		const seo = buildPostDetailSeo({
			post: null,
			loading: true,
			slug: "loading",
			resolvedLocale: "en",
		});

		expect(seo.seoTitle).toBe("Loading post - wintrover");
		expect(seo.seoDescription).toBe("");
		expect(seo.canonicalUrl).toContain("/");
		expect(seo.structuredData).toBe("");
	});
});

describe("buildBlogListSeoUrl", () => {
	test("브라우저 환경이면 현재 href를 우선 사용해야 함", () => {
		const url = buildBlogListSeoUrl({
			isBrowser: true,
			currentHref: "https://example.com/category/project",
			resolvedLocale: "en",
		});
		expect(url).toBe("https://example.com/category/project");
	});

	test("브라우저 외 환경의 영어 canonical은 루트(/)를 사용해야 함", () => {
		const url = buildBlogListSeoUrl({
			isBrowser: false,
			currentHref: null,
			resolvedLocale: "en",
		});
		expect(url.endsWith("/")).toBe(true);
		expect(url).not.toContain("/en/");
	});

	test("브라우저 외 환경의 한국어 canonical은 /ko/를 사용해야 함", () => {
		const url = buildBlogListSeoUrl({
			isBrowser: false,
			currentHref: null,
			resolvedLocale: "ko",
		});
		expect(url).toContain("/ko/");
	});
});

describe("brand metadata ssot", () => {
	test("ko/en 빌드 메타데이터는 단일 설정에서 파생되어야 함", () => {
		const en = getBlogBuildMeta("en");
		const ko = getBlogBuildMeta("ko");

		expect(en.ogTitle).toBe(blogDefaultSeo.title);
		expect(en.metaDescription).toContain("Thought Trajectory Architect");
		expect(en.ogImageAlt).toBe("wintrover profile image");

		expect(ko.ogTitle).toContain("사고 궤적 아키텍트");
		expect(ko.metaDescription).toContain("블로그와 이력서");
		expect(ko.ogImageAlt).toBe("wintrover 프로필 이미지");
	});
});
