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
});
