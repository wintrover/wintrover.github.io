import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { absolutizeSrc } from "../scripts/post-to-dev";

describe("absolutizeSrc", () => {
	const base = "https://wintrover.github.io";

	test("원격 URL 및 data URI는 유지", () => {
		expect(absolutizeSrc("https://example.com/x.png", base)).toBe(
			"https://example.com/x.png",
		);
		const dataUri =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
		expect(absolutizeSrc(dataUri, base)).toBe(dataUri);
	});

	test("절대 경로 처리 (/assets/images/)", () => {
		expect(absolutizeSrc("/assets/images/a.png", base)).toBe(
			"https://wintrover.github.io/images/a.png",
		);
		expect(absolutizeSrc("/blog/assets/images/a.png", base)).toBe(
			"https://wintrover.github.io/images/a.png",
		);
	});

	test("상대 경로 처리 (assets/images/)", () => {
		expect(absolutizeSrc("assets/images/a.png", base)).toBe(
			"https://wintrover.github.io/images/a.png",
		);
	});

	test("베이스 URL 끝에 슬래시가 있는 경우 처리", () => {
		const baseWithSlash = "https://wintrover.github.io/";
		expect(absolutizeSrc("/assets/images/a.png", baseWithSlash)).toBe(
			"https://wintrover.github.io/images/a.png",
		);
		expect(absolutizeSrc("assets/images/a.png", baseWithSlash)).toBe(
			"https://wintrover.github.io/images/a.png",
		);
	});

	test("PBT: 빈 값 및 유효하지 않은 타입은 그대로 반환", () => {
		fc.assert(
			fc.property(fc.constantFrom("", null, undefined), (v) => {
				const input = v as unknown as string;
				expect(absolutizeSrc(input, base)).toBe(input);
			}),
		);
	});

	test("PBT: assets/images/NN/* 는 images/NN-* 로 플래트닝된다", () => {
		const digit = fc
			.integer({ min: 0, max: 99 })
			.map((n) => String(n).padStart(2, "0"));
		const seg = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 16,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"));

		fc.assert(
			fc.property(
				digit,
				fc.array(seg, { minLength: 1, maxLength: 4 }),
				(d, parts) => {
					const filename = `${parts.join("/")}.png`;
					const src = `assets/images/${d}/${filename}`;
					const out = absolutizeSrc(src, base);
					expect(out).toBe(`${base}/images/${d}-${filename}`);
				},
			),
		);
	});

	test("PBT: assets/images/{dir}/* 는 images/* 로 플래트닝된다", () => {
		const dir = fc
			.string({
				unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
				minLength: 1,
				maxLength: 12,
			})
			.filter((s) => !/^\d{2}$/.test(s));
		const seg = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 16,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"));

		fc.assert(
			fc.property(
				dir,
				fc.array(seg, { minLength: 1, maxLength: 4 }),
				(d, parts) => {
					const filename = `${parts.join("/")}.png`;
					const src = `assets/images/${d}/${filename}`;
					const out = absolutizeSrc(src, base);
					expect(out).toBe(`${base}/images/${filename}`);
				},
			),
		);
	});

	test("PBT: ./ 또는 ../ 프리픽스가 있어도 assets/images 또는 images 가 인식된다", () => {
		const prefix = fc.constantFrom("", "./", "../");
		const file = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 24,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"))
			.map((s) => `${s}.png`);

		fc.assert(
			fc.property(prefix, file, (p, f) => {
				expect(absolutizeSrc(`${p}images/${f}`, base)).toBe(
					`${base}/images/${f}`,
				);
				expect(absolutizeSrc(`${p}assets/images/${f}`, base)).toBe(
					`${base}/images/${f}`,
				);
			}),
		);
	});
});
