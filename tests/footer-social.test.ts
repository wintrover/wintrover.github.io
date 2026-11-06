import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("푸터 소셜 링크 검증", () => {
	const feature = read("tests/features/footer-social.feature");

	test("Given feature 파일 When 파싱 Then 시나리오가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"footer renders email github and linkedin social links only",
		]);
	});

	test("Given 푸터 소셜 구성 When 확인 Then 이메일·GitHub·LinkedIn만 존재하고 Instagram이 없다", () => {
		const config = read("src/lib/config.ts");
		const footer = read("src/components/Footer.svelte");
		expect(config).not.toContain("instagram");
		expect(footer).not.toContain("instagram");
		expect(footer).not.toContain("icon-instagram");
		expect(footer).toContain('title="Email"');
		expect(footer).toContain('title="GitHub"');
		expect(footer).toContain('title="LinkedIn"');
	});
});
