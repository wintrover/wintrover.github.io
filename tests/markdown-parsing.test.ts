import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { parseMarkdown } from "../src/lib/markdown";
import { normalizeImageSrc } from "../src/lib/utils";

function extractImgSrcs(html: string) {
	const out: string[] = [];
	const re = /<img\s+[^>]*src=["']([^"']*)["'][^>]*>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) out.push(m[1]);
	return out;
}

describe("parseMarkdown", () => {
	test("이미지 경로 정규화 (Normalization)", () => {
		const cases = [
			{
				md: "![a](../assets/images/09/wandb-lfw-insightface-arcface.svg)",
				expect: "/images/09-wandb-lfw-insightface-arcface.svg",
			},
			{
				md: "![a](/assets/images/09/wandb-lfw-insightface-arcface.svg)",
				expect: "/images/09-wandb-lfw-insightface-arcface.svg",
			},
			{
				md: "![a](assets/images/09/wandb-lfw-insightface-arcface.svg)",
				expect: "/images/09-wandb-lfw-insightface-arcface.svg",
			},
			{
				md: "![a](/blog/assets/images/09/wandb-lfw-insightface-arcface.svg)",
				expect: "/images/09-wandb-lfw-insightface-arcface.svg",
			},
			{
				md: '<img src="/assets/images/09/wandb-lfw-insightface-arcface.svg" alt="a" />',
				expect: "/images/09-wandb-lfw-insightface-arcface.svg",
			},
		];

		for (const c of cases) {
			const { html } = parseMarkdown(c.md);
			const srcs = extractImgSrcs(html);
			expect(srcs).toHaveLength(1);
			expect(srcs[0]).toBe(c.expect);
		}
	});

	test("PBT: 경계값 및 특수 케이스 처리", () => {
		const cases = fc.constantFrom<
			| { kind: "empty"; md: string }
			| { kind: "empty-src"; md: string }
			| { kind: "path-normalize"; md: string; expect: string }
			| { kind: "already-abs"; md: string; expect: string }
		>(
			{ kind: "empty", md: "" },
			{ kind: "empty-src", md: "![no-image]()" },
			{
				kind: "path-normalize",
				md: "![special](assets/images/01/../02/test.png)",
				expect: "/images/02-test.png",
			},
			{
				kind: "already-abs",
				md: "![abs](/blog/images/already.png)",
				expect: "/images/already.png",
			},
		);

		fc.assert(
			fc.property(cases, (c) => {
				const { html } = parseMarkdown(c.md);
				const srcs = extractImgSrcs(html);
				if (c.kind === "empty") {
					expect(srcs).toHaveLength(0);
					return;
				}
				expect(srcs).toHaveLength(1);
				if (c.kind === "empty-src") {
					expect(srcs[0]).toBe("");
					return;
				}
				expect(srcs[0]).toBe(c.expect);
			}),
		);
	});

	test("PBT: 다중 이미지 처리 시 각 src가 정규화된다", () => {
		const digit = fc
			.integer({ min: 0, max: 99 })
			.map((n) => String(n).padStart(2, "0"));
		const name = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 18,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"));
		const legacy = fc
			.tuple(digit, name)
			.map(([d, n]) => `assets/images/${d}/${n}.png`);

		fc.assert(
			fc.property(fc.array(legacy, { minLength: 1, maxLength: 8 }), (paths) => {
				const md = paths.map((p, i) => `![${i}](${p})`).join(" ");
				const { html } = parseMarkdown(md);
				const srcs = extractImgSrcs(html);
				expect(srcs).toHaveLength(paths.length);
				for (let i = 0; i < paths.length; i++) {
					expect(srcs[i]).toBe(normalizeImageSrc(paths[i]));
				}
			}),
		);
	});

	test("FrontMatter 파싱 테스트", () => {
		const md = `---\ntitle: Test\ntags: t1 t2\n---\n# Content`;
		const { frontMatter, html } = parseMarkdown(md);
		expect(frontMatter).toEqual({ title: "Test", tags: ["t1", "t2"] });
		expect(html).toContain("<h1>Content</h1>");
	});
});
