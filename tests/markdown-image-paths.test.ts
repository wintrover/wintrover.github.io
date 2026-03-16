import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { normalizeImageSrc } from "../src/lib/utils";

describe("normalizeImageSrc", () => {
	test("원격 URL 및 data URI는 변경하지 않음 (Equivalence Partitioning: Remote/Data)", () => {
		expect(normalizeImageSrc("https://example.com/image.jpg")).toBe(
			"https://example.com/image.jpg",
		);
		expect(normalizeImageSrc("http://example.com/image.jpg")).toBe(
			"http://example.com/image.jpg",
		);
		const dataUri =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
		expect(normalizeImageSrc(dataUri)).toBe(dataUri);
	});

	test("절대 경로에 BASE_URL 접두 (Equivalence Partitioning: Absolute Path)", () => {
		expect(normalizeImageSrc("/assets/images/test.jpg")).toBe(
			"/images/test.jpg",
		);
		expect(normalizeImageSrc("/images/test.png")).toBe("/images/test.png");
		expect(normalizeImageSrc("/favicon.ico")).toBe("/favicon.ico");
	});

	test("상대 경로에 BASE_URL 접두 (Equivalence Partitioning: Relative Path)", () => {
		expect(normalizeImageSrc("assets/images/test.jpg")).toBe(
			"/images/test.jpg",
		);
		expect(normalizeImageSrc("images/test.png")).toBe("/images/test.png");
		expect(normalizeImageSrc("test.jpg")).toBe("/test.jpg");
	});

	test("이전 하드코딩된 /blog/ 및 BASE_URL 중복 처리", () => {
		expect(normalizeImageSrc("/blog/assets/images/test.jpg")).toBe(
			"/images/test.jpg",
		);
		expect(normalizeImageSrc("/blog/images/test.png")).toBe("/images/test.png");
	});

	test("PBT: 상대 경로의 . / .. / 빈 세그먼트는 정규화된다", () => {
		const seg = fc.constantFrom("a", "b", ".", "..", "");
		const file = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 24,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"))
			.map((s) => `${s}.jpg`);

		fc.assert(
			fc.property(
				fc.array(seg, { minLength: 0, maxLength: 6 }),
				file,
				(parts, f) => {
					const prefix = parts.join("/");
					const src = `${prefix ? `${prefix}/` : ""}images/${f}`;
					const out = normalizeImageSrc(src);
					expect(out.startsWith("/")).toBe(true);
					expect(out.includes("/./")).toBe(false);
					expect(out.includes("/../")).toBe(false);
					expect(out.includes("assets/images")).toBe(false);
					expect(normalizeImageSrc(out)).toBe(out);
				},
			),
		);
	});

	test("PBT: 레거시 assets/images 경로는 images로 플래트닝된다", () => {
		const digit = fc
			.integer({ min: 0, max: 99 })
			.map((n) => String(n).padStart(2, "0"));
		const dir = fc
			.string({
				unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
				minLength: 1,
				maxLength: 12,
			})
			.filter((s) => !/^\d{2}$/.test(s));
		const file = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 24,
			})
			.filter((s) => !s.includes("/") && !s.includes("\\"))
			.map((s) => `${s}.jpg`);

		fc.assert(
			fc.property(fc.oneof(digit, dir), file, (d, f) => {
				const src = `assets/images/${d}/${f}`;
				const out = normalizeImageSrc(src);
				if (/^\d{2}$/.test(d)) {
					expect(out).toBe(`/images/${d}-${f}`);
				} else {
					expect(out).toBe(`/images/${f}`);
				}
			}),
		);
	});

	test("PBT: 유효하지 않은 입력은 그대로 반환한다", () => {
		fc.assert(
			fc.property(fc.constantFrom("", null, undefined, 123), (v) => {
				const input = v as unknown as string;
				expect(normalizeImageSrc(input)).toBe(input);
			}),
		);
	});
});
