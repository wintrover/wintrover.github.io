import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("pitfall 포스트 콘텐츠 검증", () => {
	const feature = read("tests/features/pitfall-content.feature");

	test("Given feature 파일 When 파싱 Then 시나리오가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"pitfall post excludes authoring process checklist text",
		]);
	});

	test("Given pitfall 포스트 본문 When 검사 Then 작성 체크리스트 문구가 없다", () => {
		const post = read("src/posts/company/2026-02-01-18.md");
		expect(post).not.toContain(
			"After completion, ensure the following checklist is met:",
		);
		expect(post).not.toContain("### Verification Checklist");
		expect(post).not.toContain("### Length Guidelines");
	});
});
