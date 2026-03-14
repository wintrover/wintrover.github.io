import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("SSoT context 규칙", () => {
	test("Given context.md When 읽으면 Then 필수 헌법 규칙을 포함한다", () => {
		const content = read("context.md");
		expect(content).toContain("진실의 단일 원천");
		expect(content).toContain("Devlog 프로젝트");
		expect(content).toContain("기본 언어는 영어");
		expect(content).toContain("/ko/");
		expect(content).toContain("/en/");
		expect(content).toContain("build-github.ts");
		expect(content).toContain("image-tools.ts");
		expect(content).toContain("세로 정렬");
		expect(content).toContain("일정한 카드 크기");
		expect(content).toContain("동일한 포스트 리스트 UI 컴포넌트");
		expect(content).toContain("HTML 구조");
		expect(content).toContain("CSS");
	});

	test("Given build-github.ts When URL 규칙 검증 Then /en 레거시 생성 로직이 없어야 한다", () => {
		const buildScript = read("scripts/build-github.ts");
		expect(buildScript).not.toContain("legacyEnHtml");
		expect(buildScript).not.toContain('path.join(dist, "en", "index.html")');
	});

	test("Given list routes When UI 구성 검증 Then 단일 PostFeed 컴포넌트를 재사용한다", () => {
		const blogList = read("src/components/BlogList.svelte");
		const homePage = read("src/routes/+page.svelte");
		expect(blogList).toContain('import PostFeed from "./PostFeed.svelte"');
		expect(homePage).toContain(
			'import PostFeed from "../components/PostFeed.svelte"',
		);
	});
});
