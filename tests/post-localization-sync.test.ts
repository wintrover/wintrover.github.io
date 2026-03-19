import fs from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("post localization synchronization", () => {
	test("Given paired localized post When verifying key claims Then both copies preserve the same intent", () => {
		const ko = read("src/posts/ko/project/2026-03-17-19.md");
		const en = read("src/posts/project/2026-03-17-19.md");

		expect(ko).toContain("AI는 믿을 수 없다. 그러니 다시 손으로 코딩하라.");
		expect(en).toContain("AI is not trustworthy. Go back to coding by hand.");
		expect(ko).toContain("이건 엔지니어링이 아니다. 비용 이연이다.");
		expect(en).toContain("That is not engineering. It is deferred cost.");
		expect(ko).toContain("그래서 나는 Archright를 만들기로 했다.");
		expect(en).toContain("That decision is what led to Archright.");
		expect(ko).toContain("여정의 첫 페이지다.");
		expect(en).toContain("the first page of a journey");
	});

	test("PBT: Given policy terms When scanning localized files Then required synchronization terms exist", () => {
		const ko = read("src/posts/ko/project/2026-03-17-19.md");
		const en = read("src/posts/project/2026-03-17-19.md");

		fc.assert(
			fc.property(
				fc.constantFrom(
					["결정론적 품질 게이트", "deterministic quality gates"] as const,
					["확률적", "probabilistic"] as const,
				),
				([koToken, enToken]) => {
					expect(ko.includes(koToken)).toBe(true);
					expect(en.includes(enToken)).toBe(true);
				},
			),
		);
	});

	test("Given paired localized post When applying dashed delimiters Then both copies keep matching boundaries", () => {
		const ko = read("src/posts/ko/project/2026-03-19-20.md");
		const en = read("src/posts/project/2026-03-19-20.md");
		const delimiter =
			'<hr style="border: 0; border-top: 1px dashed #52525b; margin: 1.2rem 0;" />';

		const koCount = ko.match(new RegExp(delimiter, "g"))?.length ?? 0;
		const enCount = en.match(new RegExp(delimiter, "g"))?.length ?? 0;

		expect(koCount).toBe(4);
		expect(enCount).toBe(4);
		expect(koCount).toBe(enCount);
		expect(ko).toContain("### 1) 의도의 결핍");
		expect(en).toContain("### 1) Deficit of Intent");
		expect(ko).toContain("## 다시 되찾는 빌딩의 기쁨");
		expect(en).toContain("## Reclaiming the Joy of Building");
	});

	test("PBT: Given delimiter policy When scanning paired posts Then both localized copies keep the same delimiter token", () => {
		const ko = read("src/posts/ko/project/2026-03-19-20.md");
		const en = read("src/posts/project/2026-03-19-20.md");

		fc.assert(
			fc.property(
				fc.constantFrom(
					'<hr style="border: 0; border-top: 1px dashed #52525b; margin: 1.2rem 0;" />',
				),
				(token) => {
					expect(ko.includes(token)).toBe(true);
					expect(en.includes(token)).toBe(true);
				},
			),
		);
	});

	test("Given refined Korean narrative When syncing localized copy Then English preserves matched nuance and paragraph intent", () => {
		const ko = read("src/posts/ko/project/2026-03-19-20.md");
		const en = read("src/posts/project/2026-03-19-20.md");

		expect(ko).toContain("괴로워하며 근원을 파고들었다");
		expect(en).toContain("in agony, drilling into the root cause");
		expect(ko).toContain("검토 노동의 지옥");
		expect(en).toContain("hell of review labor");
		expect(ko).toContain("생산성과 성능, 안정성의 삼위일체");
		expect(en).toContain("Trinity of Productivity, Performance, and Stability");
		expect(ko).toContain("99% 정확도의 AI 코드를 다시 99% 정확도의 AI가 검사");
		expect(en).toContain(
			"99%-accurate AI inspecting code produced by another 99%-accurate AI",
		);
		expect(ko).toContain("거의 확실함'은 '확실하지 않음'");
		expect(en).toContain('"almost certain" is a synonym for "not certain."');
		expect(ko).toContain("AI가 만든 쓰레기를 치우는 청소부");
		expect(en).toContain("janitors cleaning up AI-generated trash");
		expect(ko).toContain("### 1. 사고 궤적 시스템: 의도의 박제");
		expect(en).toContain("### 1. Thought Trajectory System: Freezing Intent");
	});
});
