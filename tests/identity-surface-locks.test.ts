// 정체성 무방비 표면 잠금 테스트 - 재발급된 직함을 노출 표면별로 고정한다
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const KO_TITLE = "무결성 증명 엔지니어";
const EN_TITLE = "Integrity Proof Engineer";

type ResumeLocale = {
	site_subtitle: string;
	meta: {
		description: string;
		keywords: string;
		og_description: string;
	};
	about_content: string;
};

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

function readLocale(rel: string) {
	return JSON.parse(read(rel)) as ResumeLocale;
}

describe("identity surface locks", () => {
	test("Given ko resume locale When identity fields are read Then the Korean title is present", () => {
		const ko = readLocale("src/lib/resume/locales/ko.json");
		expect(ko.site_subtitle).toContain(KO_TITLE);
		expect(ko.meta.description).toContain(KO_TITLE);
		expect(ko.meta.keywords).toContain(KO_TITLE);
		expect(ko.meta.og_description).toContain(KO_TITLE);
		expect(ko.about_content).toContain(KO_TITLE);
	});

	test("Given en resume locale When identity fields are read Then the English title is present", () => {
		const en = readLocale("src/lib/resume/locales/en.json");
		expect(en.site_subtitle).toContain(EN_TITLE);
		expect(en.meta.description).toContain(EN_TITLE);
		expect(en.meta.keywords).toContain(EN_TITLE);
		expect(en.meta.og_description).toContain(EN_TITLE);
		expect(en.about_content).toContain(EN_TITLE);
	});

	test("Given sidebar About copy When the module is read Then the English title is present", () => {
		expect(read("src/components/Sidebar.svelte")).toContain(EN_TITLE);
	});

	test("Given AGENTS.md When the identity declaration is read Then both titles are present", () => {
		const agents = read("AGENTS.md");
		expect(agents).toContain(KO_TITLE);
		expect(agents).toContain(EN_TITLE);
	});
});
