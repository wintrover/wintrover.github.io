import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("모던 UI 모션 시나리오 검증", () => {
	const feature = read("tests/features/modern-ui-motion.feature");

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"Homepage sections expose modern motion hooks",
			"Sidebar and footer expose motion hooks",
			"Resume surface exposes motion hooks",
			"Category route changes replay list motion",
			"Mobile sidebar toggle keeps sidebar open after manual open",
			"Sidebar active indicator follows current route",
			"Sidebar nested subtopics are constrained to approved list",
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
});
