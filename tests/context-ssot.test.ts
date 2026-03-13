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
		expect(content).toContain("HTML 구조");
		expect(content).toContain("CSS");
	});

	test("Given build-github.ts When URL 규칙 검증 Then /en 레거시 생성 로직이 없어야 한다", () => {
		const buildScript = read("scripts/build-github.ts");
		expect(buildScript).not.toContain("legacyEnHtml");
		expect(buildScript).not.toContain('path.join(dist, "en", "index.html")');
	});

	test("Given BlogList.svelte When 카드 레이아웃 검증 Then 세로 정렬과 고정 카드 높이를 유지한다", () => {
		const blogList = read("src/components/BlogList.svelte");
		expect(blogList).toMatch(/\.posts\s*\{[\s\S]*flex-direction:\s*column;/);
		expect(blogList).toMatch(/\.post\s*\{[\s\S]*height:\s*\d+px;/);
	});
});
