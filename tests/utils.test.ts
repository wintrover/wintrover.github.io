import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
	formatDate,
	normalizeImageSrc,
	parseFrontMatter,
	slugify,
	truncateText,
} from "../src/lib/utils";

// TODO: Add tests for .svelte components

// Coverage configuration (added for reference)
// coverage: {
//   provider: "v8",
//   include: ["src/**/*.ts", "scripts/**/*.ts", "src/**/*.svelte"],
//   exclude: ["src/posts/**/*.md", "src/templates/**/*.md"],
//   reporter: ["text", "json", "html"],
//   all: true,
// }

// vitest configuration (reference)
// test: {
//   globals: true,
//   environment: "node",
//   include: ["tests/**/*.test.ts"],
//   coverage: {
//     provider: "v8",
//     include: ["src/**/*.ts", "scripts/**/*.ts", "src/**/*.svelte"],
//     exclude: ["src/posts/**/*.md", "src/templates/**/*.md"],
//     reporter: ["text", "json", "html"],
//     all: true,
//   },
//   env: {
//     BASE_URL: "/blog/",
//   },
// }

describe("normalizeImageSrc", () => {
	test("비문자열 입력 처리 (EP: Non-string)", () => {
		expect(normalizeImageSrc(null)).toBe(null);
		expect(normalizeImageSrc(undefined)).toBe(undefined);
		expect(normalizeImageSrc(123)).toBe(123);
	});

	test("Line 46 coverage: p is not empty after BASE removal", () => {
		// p starts with BASE, then we slice it. The remaining p goes to resolveRelativePath.
		expect(normalizeImageSrc("/blog/test.png")).toBe("/test.png");
	});

	test("절대 URL 유지 (EP: Absolute URL)", () => {
		expect(normalizeImageSrc("http://example.com/a.png")).toBe(
			"http://example.com/a.png",
		);
		expect(normalizeImageSrc("https://example.com/a.png")).toBe(
			"https://example.com/a.png",
		);
		expect(normalizeImageSrc("data:image/png;base64,123")).toBe(
			"data:image/png;base64,123",
		);
		// Mutation test: URL containing but not starting with absolute prefix
		expect(normalizeImageSrc("prefix-https://example.com")).not.toBe(
			"prefix-https://example.com",
		);
	});

	test("BASE 경로 제거 및 재부착 (EP: With BASE Prefix)", () => {
		expect(normalizeImageSrc("/blog/images/test.png")).toBe("/images/test.png");
	});

	test("루트 경로 처리 (EP: Root-relative)", () => {
		expect(normalizeImageSrc("/images/test.png")).toBe("/images/test.png");
	});

	test("상대 경로 및 경로 정규화 (EP: Path Traversal)", () => {
		expect(normalizeImageSrc("./images/test.png")).toBe("/images/test.png");
		expect(normalizeImageSrc("../images/test.png")).toBe("/images/test.png");
		expect(normalizeImageSrc("a/../b/c.png")).toBe("/b/c.png");
		// Line 14 coverage: 빈 파트 및 현재 디렉토리 기호 처리
		expect(normalizeImageSrc("/a//b/./c.png")).toBe("/a/b/c.png");
	});

	test("Legacy Assets 경로 변환 (EP: Legacy Assets)", () => {
		expect(normalizeImageSrc("assets/images/01/arch.svg")).toBe(
			"/images/01-arch.svg",
		);
		expect(normalizeImageSrc("assets/images/other/test.png")).toBe(
			"/images/test.png",
		);
		expect(normalizeImageSrc("assets/images/simple.png")).toBe(
			"/images/simple.png",
		);
	});

	test("PBT: 빈 문자열 및 루트 경로 처리", () => {
		fc.assert(
			fc.property(fc.constantFrom("", "/", "/blog/"), (src) => {
				const out = normalizeImageSrc(src);
				if (src === "") {
					expect(out).toBe("");
				} else {
					expect(out).toBe("/");
				}
			}),
		);
	});

	test("PBT: 비절대 경로는 / 프리픽스를 갖고 안정적이다", () => {
		const nonAbsolutePath = fc
			.string()
			.filter((s) => s.length > 0 && !/^(https?:\/\/|data:)/i.test(s));

		fc.assert(
			fc.property(nonAbsolutePath, (src) => {
				const out = normalizeImageSrc(src);
				expect(typeof out).toBe("string");
				expect(out.startsWith("/")).toBe(true);
				expect(normalizeImageSrc(out)).toBe(out);
			}),
			{ numRuns: 200 },
		);
	});
});

describe("formatDate", () => {
	test("날짜 포맷팅 확인 (ko-KR)", () => {
		const result = formatDate("2023-10-26");
		expect(result).toMatch(/2023\.\s*10\.\s*26\./);
	});

	test("PBT: Invalid Date 입력은 Invalid Date를 반환", () => {
		const invalidDateString = fc
			.string()
			.filter((s) => Number.isNaN(new Date(s).getTime()));

		fc.assert(
			fc.property(invalidDateString, (s) => {
				expect(formatDate(s)).toBe("Invalid Date");
			}),
			{ numRuns: 200 },
		);
	});
});

describe("truncateText", () => {
	test("wordLimit 이하인 경우 원본 반환 (EP: Length <= Limit)", () => {
		const text = "  Hello world  ";
		expect(truncateText(text, 5)).toBe("Hello world");
	});

	test("wordLimit 초과하는 경우 절삭 (EP: Length > Limit)", () => {
		const text = "One two three four five";
		const result = truncateText(text, 3);
		expect(result).toBe("One two three...");
	});

	test("wordLimit와 단어 수가 같은 경우 (BVA: Length == Limit)", () => {
		const text = "One two three";
		expect(truncateText(text, 3)).toBe("One two three");
	});

	test("공백만 있는 경우 처리 (Line 67)", () => {
		expect(truncateText("   ", 5)).toBe("");
	});

	test("HTML 태그 제거 확인 (EP: HTML Content)", () => {
		const text = "<p>Hello <strong>world</strong></p>";
		expect(truncateText(text, 10)).toBe("Hello world");
	});

	test("PBT: wordLimit=0이면 단어가 있는 경우 ... 처리", () => {
		const word = fc
			.string({
				unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
				minLength: 1,
				maxLength: 12,
			})
			.filter((s) => !s.includes("\n"));

		fc.assert(
			fc.property(fc.array(word, { minLength: 1, maxLength: 50 }), (words) => {
				const text = words.join(" ");
				expect(truncateText(text, 0)).toBe("...");
			}),
		);
	});

	test("PBT: falsy 입력은 빈 문자열을 반환", () => {
		fc.assert(
			fc.property(fc.constantFrom("", null, undefined), (v) => {
				expect(truncateText(v as any, 10)).toBe("");
			}),
		);
	});

	test("PBT: 기본 wordLimit=30 초과 시 ... 로 절삭", () => {
		const word = fc
			.string({
				unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
				minLength: 1,
				maxLength: 12,
			})
			.filter((s) => !s.includes("\n"));

		fc.assert(
			fc.property(
				fc.array(word, { minLength: 31, maxLength: 120 }),
				(words) => {
					const text = words.join(" ");
					const result = truncateText(text);
					expect(result.endsWith("...")).toBe(true);
					expect(result.split(" ").length).toBe(30);
				},
			),
		);
	});
});

describe("slugify", () => {
	test("공백 및 특수문자 처리", () => {
		expect(slugify("Hello World!")).toBe("hello-world");
		expect(slugify("Hello   World")).toBe("hello-world");
		expect(slugify("---Hello---World---")).toBe("hello-world");
		expect(slugify("   multiple   spaces   ")).toBe("multiple-spaces");
		expect(slugify("---multiple---hyphens---")).toBe("multiple-hyphens");
		// Mutation test: Multiple leading/trailing hyphens
		expect(slugify("---hello---")).toBe("hello");
		expect(slugify("hello---")).toBe("hello");
		expect(slugify("---hello")).toBe("hello");
	});

	test("PBT: slugify는 제약된 슬러그를 만들고 멱등성을 가진다", () => {
		fc.assert(
			fc.property(fc.string(), (s) => {
				const slug = slugify(s);
				expect(slug).toBe(slug.toLowerCase());
				expect(slugify(slug)).toBe(slug);
				expect(/^[a-z0-9_]*(?:-[a-z0-9_]+)*$/.test(slug)).toBe(true);
			}),
		);
	});

	test("PBT: falsy 입력은 빈 문자열을 반환", () => {
		fc.assert(
			fc.property(fc.constantFrom("", null, undefined), (v) => {
				expect(slugify(v as any)).toBe("");
			}),
		);
	});
});

describe("parseFrontMatter", () => {
	test("정상적인 FrontMatter 파싱 (EP: Valid Content)", () => {
		const md =
			'---\ntitle: "My Title"\ndate: 2023-10-26\ntags: t1, t2\npublished: true\n---\nBody content';
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({
			title: "My Title",
			date: "2023-10-26",
			tags: ["t1", "t2"],
			published: true,
		});
		expect(content.trim()).toBe("Body content");
	});

	test("FrontMatter가 없는 경우 (EP: No FrontMatter)", () => {
		const md = "Just content";
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({});
		expect(content).toBe(md);
	});

	test("숫자 및 불리언 타입 변환 확인 (EP: Type Conversion)", () => {
		const md = "---\ncount: 123\nactive: false\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.count).toBe(123);
		expect(data.active).toBe(false);
	});

	test("싱글 쿼트 문자열 처리 확인 (EP: Single Quote)", () => {
		const md = "---\ntitle: 'Single Quote'\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.title).toBe("Single Quote");
	});

	test("태그 구분자(쉼표, 공백) 및 빈 태그 처리 (EP: Tags Split)", () => {
		const md = "---\ntags: t1,  t2 t3,,t4\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.tags).toEqual(["t1", "t2", "t3", "t4"]);
	});

	test("PBT: 빈 FrontMatter는 data가 비어있고 body는 trim 된다", () => {
		fc.assert(
			fc.property(fc.string(), (body) => {
				const md = `---\n---\n${body}`;
				const { data, content } = parseFrontMatter(md);
				expect(data).toEqual({});
				expect(content).toBe(body.trim());
			}),
		);
	});

	test("PBT: delimiter 라인의 trailing spaces는 허용된다", () => {
		const spaces = fc.string({
			unit: fc.constantFrom(" ", "\t"),
			minLength: 0,
			maxLength: 4,
		});
		const value = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_- ".split(""),
				),
				minLength: 1,
				maxLength: 30,
			})
			.filter(
				(s) => !s.includes("\n") && !s.includes("\r") && !s.includes(":"),
			);

		fc.assert(
			fc.property(spaces, value, fc.string(), (ws, v, body) => {
				const md = `---${ws}\ntitle: ${v}\n---${ws}\n${body}`;
				const { data, content } = parseFrontMatter(md);
				const trimmed = v.trim();
				const expected =
					trimmed === "true"
						? true
						: trimmed === "false"
							? false
							: trimmed !== "" && !Number.isNaN(Number(trimmed))
								? Number(trimmed)
								: trimmed;
				expect(data.title).toBe(expected);
				expect(content).toBe(body.trim());
			}),
		);
	});

	test("PBT: 주석/빈 라인은 무시되고 키/값은 trim 된다", () => {
		const key = fc
			.string({
				unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
				minLength: 1,
				maxLength: 12,
			})
			.filter((s) => !s.includes("\n") && !s.includes("\r"));
		const value = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_- ".split(""),
				),
				minLength: 0,
				maxLength: 40,
			})
			.filter((s) => !s.includes("\n") && !s.includes("\r"));

		fc.assert(
			fc.property(key, value, fc.string(), (k, v, body) => {
				const md = `---\n# comment\n\n  ${k}  :   ${v}  \n---\n${body}`;
				const { data, content } = parseFrontMatter(md);
				expect(Object.keys(data)).toEqual(v.trim() === "" ? [k] : [k]);
				const trimmed = v.trim();
				const expected =
					trimmed === "true"
						? true
						: trimmed === "false"
							? false
							: trimmed !== "" && !Number.isNaN(Number(trimmed))
								? Number(trimmed)
								: trimmed;
				expect(data[k]).toBe(expected);
				expect(content).toBe(body.trim());
			}),
		);
	});

	test("PBT: tags는 쉼표/공백 구분자를 기준으로 split 된다", () => {
		const token = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
				),
				minLength: 1,
				maxLength: 10,
			})
			.filter((s) => !s.includes(",") && !s.includes(" "));

		fc.assert(
			fc.property(
				fc.array(token, { minLength: 0, maxLength: 20 }),
				(tokens) => {
					const joined = tokens.join(",,  ");
					const md = `---\ntags: ${joined}\n---\n`;
					const { data } = parseFrontMatter(md);
					expect(data.tags).toEqual(tokens);
				},
			),
		);
	});

	test("PBT: 따옴표가 짝이 맞지 않으면 값은 그대로 보존된다", () => {
		const raw = fc.string({
			unit: fc.constantFrom(
				..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
			),
			minLength: 1,
			maxLength: 40,
		});

		fc.assert(
			fc.property(raw, (s) => {
				const md = `---\nkey: "${s}\n---\n`;
				const { data } = parseFrontMatter(md);
				expect(data.key).toBe(`"${s}`);
			}),
		);
	});

	test("PBT: :로 시작하는 라인은 무시된다", () => {
		const rest = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_- ".split(""),
				),
				minLength: 1,
				maxLength: 30,
			})
			.filter((s) => !s.includes("\n") && !s.includes("\r"));

		fc.assert(
			fc.property(rest, (s) => {
				const md = `---\n:${s}\n---\nContent`;
				const { data } = parseFrontMatter(md);
				expect(data).toEqual({});
			}),
		);
	});

	test("PBT: boolean/number는 변환되고 빈 값은 빈 문자열로 남는다", () => {
		fc.assert(
			fc.property(fc.integer(), fc.boolean(), fc.string(), (n, b, body) => {
				const md = `---\nnum: ${n}\nflag: ${b}\nempty:\n---\n${body}`;
				const { data, content } = parseFrontMatter(md);
				expect(data.num).toBe(n);
				expect(data.flag).toBe(b);
				expect(data.empty).toBe("");
				expect(content).toBe(body.trim());
			}),
		);
	});
});
