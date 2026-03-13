import { describe, expect, test } from "vitest";
import { buildPostDetailSeo } from "../src/lib/config";
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
