import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("이력서 콘텐츠 검증", () => {
	const feature = read("tests/features/resume-content.feature");

	test("Given feature 파일 When 파싱 Then 시나리오가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"resume social linkedin uses canonical profile URL",
			"resume meta title uses unified short label",
			"resume wintrover social github link uses personal profile",
		]);
	});

	test("Given resume 사이트 설정 When 링크 확인 Then linkedin canonical URL을 사용한다", () => {
		const site = read("src/lib/resume/site.ts");
		expect(site).toContain(
			'url: "https://www.linkedin.com/in/suhyok-yoon-1934b713a/"',
		);
	});

	test('Given resume 로케일 메타 When 검사 Then title/og_title이 "resume"으로 통일된다', () => {
		const en = read("src/lib/resume/locales/en.json");
		const ko = read("src/lib/resume/locales/ko.json");
		const buildScript = read("scripts/build-github.ts");
		expect(en).toContain('"title": "resume"');
		expect(en).toContain('"og_title": "resume"');
		expect(ko).toContain('"title": "resume"');
		expect(ko).toContain('"og_title": "resume"');
		expect(buildScript).toContain(
			'const title = String(json?.meta?.title ?? "resume")',
		);
	});

	test("Given resume 사이트 설정 When 소셜 링크 확인 Then github 주소는 wintrover 개인 프로필을 사용한다", () => {
		const site = read("src/lib/resume/site.ts");
		expect(site).toContain('url: "https://github.com/wintrover"');
	});
});
