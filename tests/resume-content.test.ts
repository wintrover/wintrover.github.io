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
			"resume project entry names the real Axiom project",
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

	test("Given 이력서 프로젝트 항목 When 확인 Then Axiom 무결성 증명 엔진 실체를 기술한다", () => {
		const en = JSON.parse(read("src/lib/resume/locales/en.json"));
		const ko = JSON.parse(read("src/lib/resume/locales/ko.json"));
		expect(en.projects.axiom.title).toBe("Axiom");
		expect(ko.projects.axiom.title).toBe("Axiom");
		expect(en.projects.axiom.quote).toContain("integrity proof engine");
		expect(ko.projects.axiom.quote).toContain("무결성 증명 엔진");
		for (const term of ["Z3", "Lean 4"]) {
			expect(en.projects.axiom.description).toContain(term);
			expect(ko.projects.axiom.description).toContain(term);
		}
		expect(JSON.stringify(en.projects)).not.toContain("ReasoningTrace");
		expect(JSON.stringify(ko.projects)).not.toContain("ReasoningTrace");
		expect("devlog" in en.projects).toBe(false);
		expect("devlog" in ko.projects).toBe(false);
	});
});
