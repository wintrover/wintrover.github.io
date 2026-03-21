import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("PostFeed 메타 정렬 검증", () => {
	const feature = read("tests/features/post-feed-meta-layout.feature");

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual(["date appears before tags in post meta row"]);
	});

	test("Given PostFeed 메타 행 When 마크업 검사 Then 날짜가 태그보다 먼저 렌더링된다", () => {
		const postFeed = read("src/components/PostFeed.svelte");
		const metaBlockMatch = postFeed.match(/<div class="meta">[\s\S]*?<\/div>/);

		expect(metaBlockMatch).not.toBeNull();

		const metaBlock = metaBlockMatch?.[0] ?? "";
		const dateIndex = metaBlock.indexOf('<span class="meta-date">');
		const keywordListIndex = metaBlock.indexOf('<div class="keyword-list">');

		expect(dateIndex).toBeGreaterThanOrEqual(0);
		expect(keywordListIndex).toBeGreaterThanOrEqual(0);
		expect(dateIndex).toBeLessThan(keywordListIndex);
	});

	test("Given PostFeed 메타 스타일 When 검사 Then 태그는 날짜 바로 오른쪽 흐름을 유지한다", () => {
		const postFeed = read("src/components/PostFeed.svelte");

		expect(postFeed).not.toContain("margin-left: auto");
		expect(postFeed).not.toContain("justify-content: flex-end");
	});
});
