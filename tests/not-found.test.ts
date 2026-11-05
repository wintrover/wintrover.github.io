import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("Not-found 라우트 시나리오 검증", () => {
	const feature = read("tests/features/not-found.feature");
	const urlSpec = read("docs/spec/url-architecture.md");
	const app = read("src/App.svelte");
	const config = read("src/lib/config.ts");
	const postDetail = read("src/components/PostDetail.svelte");

	const notFoundPath = path.join(root, "src/components/NotFound.svelte");
	const notFoundExists = fs.existsSync(notFoundPath);
	const notFound = notFoundExists ? fs.readFileSync(notFoundPath, "utf-8") : "";

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"Unknown hash route renders the NotFound view instead of blank content",
			"English build renders English general not-found copy",
			"Korean build renders Korean general not-found copy",
			"English post detail not-found keeps the existing copy",
			"Korean post detail not-found renders Korean copy",
			"Server 404 shell and SEO boundary remain unchanged",
		]);
	});

	test("Given feature 파일 When 구조 검증 Then 각 시나리오는 Given/When/Then 흐름을 가진다", () => {
		const blocks = feature
			.split(/\r?\n(?=\s*Scenario:)/)
			.filter((block) => block.includes("Scenario:"));
		for (const block of blocks) {
			expect(block).toContain("Given ");
			expect(block).toContain("When ");
			expect(block).toContain("Then ");
		}
	});

	test("Given 라우트 맵 When catch-all 검증 Then '*' 키는 마지막 항목으로 존재한다", () => {
		const routesBlock = app.match(/const routes = \{([\s\S]*?)\};/);
		expect(routesBlock).not.toBeNull();
		const keys = [
			...(routesBlock?.[1]?.matchAll(/("|')(\/[^"']*|\*)\1\s*:/g) ?? []),
		].map((match) => match[2]);
		expect(keys).toEqual([
			"/",
			"/category/:category",
			"/category/:category/tag/:tag",
			"/post/:slug",
			"/resume",
			"/resume/",
			"/resume/*",
			"*",
		]);
		expect(app).toContain(
			'import NotFound from "./components/NotFound.svelte"',
		);
	});

	test("Given NotFound 뷰 When 구현 검증 Then 로케일 감지와 홈 복귀 메커니즘을 재사용한다", () => {
		expect(notFoundExists).toBe(true);
		expect(notFound).toContain("detectLocaleFromRuntime(");
		expect(notFound).toContain("getNotFoundCopy(");
		expect(notFound).toContain('scope: "page"');
		expect(notFound).toContain('push("/")');
	});

	test("Given SPA not-found 뷰 When SEO 경계 검증 Then robots 색인 제외를 주장하지 않는다", () => {
		expect(notFound).not.toMatch(/noindex/i);
		expect(notFound).toContain('rel="canonical"');
	});

	test("Given notFound 문구 When SSOT 검증 Then config의 ko/en 쌍에서 공급된다", () => {
		expect(config).toContain("Page not found");
		expect(config).toContain(
			"The page you're looking for doesn't exist or has been moved.",
		);
		expect(config).toContain("페이지를 찾을 수 없습니다");
		expect(config).toContain("찾으시는 페이지가 없거나 이동되었습니다.");
		expect(config).toContain("포스트를 찾을 수 없습니다");
		expect(config).toContain("찾으시는 포스트가 없거나 이동되었습니다.");
		expect(config).toContain("Go back to home");
		expect(config).toContain("홈으로 돌아가기");
	});

	test("Given PostDetail not-found 블록 When 문구 검증 Then config copy를 사용한다", () => {
		expect(postDetail).toContain("getNotFoundCopy(");
		expect(postDetail).toContain('scope: "post"');
		expect(postDetail).not.toContain("<h2>Post not found</h2>");
	});

	test("Given 서버 404 셤 When 진입 처리 검증 Then public/404.html의 셤과 명세가 유지된다", () => {
		const shell = read("public/404.html");
		expect(shell).toContain('content="noindex,nofollow"');
		expect(shell).toContain("window.location.replace");
		expect(urlSpec).toContain("Not-Found 라우트 계약");
		expect(urlSpec).toContain("catch-all `'*'`");
	});
});
