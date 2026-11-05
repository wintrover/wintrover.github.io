import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	blogDefaultSeo,
	buildBlogListSeoUrl,
	buildNotFoundSeoUrl,
	buildPostDetailSeo,
	getBlogBuildMeta,
	getNotFoundCopy,
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

		expect(seo.seoTitle).toBe("Detailed Post");
		expect(seo.seoDescription).toBe("Detailed excerpt");
		expect(seo.canonicalUrl).toContain("/post/detailed-post/");
		expect(seo.structuredData).toContain('"@type":"BlogPosting"');
	});

	test("post가 없고 로딩이 끝나면 로케일별 not found SEO를 반환해야 함", () => {
		const en = buildPostDetailSeo({
			post: null,
			loading: false,
			slug: "missing",
			resolvedLocale: "en",
		});

		expect(en.seoTitle).toBe("Post not found");
		expect(en.seoDescription).toBe(
			"The post you're looking for doesn't exist or has been moved.",
		);

		const ko = buildPostDetailSeo({
			post: null,
			loading: false,
			slug: "missing",
			resolvedLocale: "ko",
		});

		expect(ko.seoTitle).toBe("포스트를 찾을 수 없습니다");
		expect(ko.seoDescription).toBe("찾으시는 포스트가 없거나 이동되었습니다.");
		expect(ko.canonicalUrl).toContain("/ko/");
		expect(ko.structuredData).toBe("");
	});

	test("post가 없고 로딩 중이면 loading SEO를 반환해야 함", () => {
		const seo = buildPostDetailSeo({
			post: null,
			loading: true,
			slug: "loading",
			resolvedLocale: "en",
		});

		expect(seo.seoTitle).toBe("Post");
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

describe("notFound copy ssot", () => {
	test("일반 NotFound 문구는 ko/en 쌍으로 공급되어야 함", () => {
		const en = getNotFoundCopy({ scope: "page", resolvedLocale: "en" });
		expect(en.title).toBe("Page not found");
		expect(en.description).toBe(
			"The page you're looking for doesn't exist or has been moved.",
		);
		expect(en.homeLink).toBe("Go back to home");

		const ko = getNotFoundCopy({ scope: "page", resolvedLocale: "ko" });
		expect(ko.title).toBe("페이지를 찾을 수 없습니다");
		expect(ko.description).toBe("찾으시는 페이지가 없거나 이동되었습니다.");
		expect(ko.homeLink).toBe("홈으로 돌아가기");
	});

	test("게시글 not-found 문구는 ko/en 쌍으로 공급되어야 함", () => {
		const en = getNotFoundCopy({ scope: "post", resolvedLocale: "en" });
		expect(en.title).toBe("Post not found");
		expect(en.description).toBe(
			"The post you're looking for doesn't exist or has been moved.",
		);
		expect(en.homeLink).toBe("Go back to home");

		const ko = getNotFoundCopy({ scope: "post", resolvedLocale: "ko" });
		expect(ko.title).toBe("포스트를 찾을 수 없습니다");
		expect(ko.description).toBe("찾으시는 포스트가 없거나 이동되었습니다.");
		expect(ko.homeLink).toBe("홈으로 돌아가기");
	});

	test("not-found canonical URL은 로케일 루트 정책을 따라야 함", () => {
		expect(buildNotFoundSeoUrl("en")).toContain("/");
		expect(buildNotFoundSeoUrl("en")).not.toContain("/en/");
		expect(buildNotFoundSeoUrl("ko")).toContain("/ko/");
	});
});

describe("brand metadata ssot", () => {
	test("ko/en 빌드 메타데이터는 단일 설정에서 파생되어야 함", () => {
		const en = getBlogBuildMeta("en");
		const ko = getBlogBuildMeta("ko");

		expect(en.ogTitle).toBe(blogDefaultSeo.title);
		expect(en.metaDescription).toContain("Integrity Proof Engineer");
		expect(en.ogImageAlt).toBe("Axiom profile image");

		expect(ko.ogTitle).toContain("무결성 증명 엔지니어");
		expect(ko.metaDescription).toContain("블로그와 이력서");
		expect(ko.ogImageAlt).toBe("Axiom 프로필 이미지");
	});

	test("public/404.html 타이틀은 재발급된 직함을 반영해야 함", () => {
		const content = fs.readFileSync(
			path.join(process.cwd(), "public", "404.html"),
			"utf-8",
		);
		expect(content).toContain("Integrity Proof Engineer");
		expect(content).not.toContain("Thought Trajectory Architect");
	});

	test("build-github.ts 폴백 문자열은 재발급된 직함을 반영해야 함", () => {
		const content = fs.readFileSync(
			path.join(process.cwd(), "scripts", "build-github.ts"),
			"utf-8",
		);
		expect(content).toContain("Integrity Proof Engineer");
		expect(content).not.toContain("Thought Trajectory Architect");
	});
});
