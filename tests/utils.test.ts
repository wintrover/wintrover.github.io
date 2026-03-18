import fs from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";
import {
	formatDate,
	normalizeImageSrc,
	parseFrontMatter,
	slugify,
	truncateText,
} from "../src/lib/utils";

type WintrTestGlobal = typeof globalThis & {
	__WINTR_BASE_URL__?: string;
	__WINTR_ENV_BASE_URL__?: string;
	__WINTR_IMPORT_META_ENV__?: { BASE_URL?: unknown };
};

const testGlobal = globalThis as WintrTestGlobal;

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
		expect(normalizeImageSrc("assets/images/other/a/b.png")).toBe(
			"/images/a/b.png",
		);
		expect(normalizeImageSrc("assets/images/simple.png")).toBe(
			"/images/simple.png",
		);
	});

	test("BASE 오버라이드로 startsWith(base) 분기 커버", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/x/";
		try {
			expect(normalizeImageSrc("/x/y.png")).toBe("/x/y.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("BASE가 후행 슬래시가 없어도 경로를 보존해야 한다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/blog";
		try {
			expect(normalizeImageSrc("images/a.png")).toBe("/blog/images/a.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("BASE 오버라이드가 빈 문자열이면 기본 BASE로 폴백된다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "";
		try {
			expect(normalizeImageSrc("/blog/test.png")).toBe("/test.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("__WINTR_ENV_BASE_URL__ 오버라이드는 getBase에 적용된다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = "/z/";
		try {
			expect(normalizeImageSrc("images/a.png")).toBe("/z/images/a.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
		}
	});

	test("__WINTR_ENV_BASE_URL__가 빈 문자열이면 '/'로 폴백된다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = "";
		try {
			expect(normalizeImageSrc("/blog/test.png")).toBe("/test.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
		}
	});

	test("BASE_URL 환경값을 사용해 상대 경로를 prefix 한다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const prevProcessBaseUrl = process.env.BASE_URL;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		process.env.BASE_URL = "/v/";
		try {
			expect(normalizeImageSrc("images/a.png")).toBe("/v/images/a.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			process.env.BASE_URL = prevProcessBaseUrl;
		}
	});

	test("process가 없어도 예외 없이 동작한다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		vi.stubGlobal("process", undefined);
		try {
			expect(() => normalizeImageSrc("images/a.png")).not.toThrow();
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("process.env.BASE_URL이 string이 아니면 무시한다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		vi.stubGlobal("process", {
			env: { BASE_URL: 123 },
		} as unknown as NodeJS.Process);
		try {
			expect(normalizeImageSrc("images/a.png")).toBe("/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("process.env.BASE_URL이 빈 문자열이면 import.meta.env 또는 기본값으로 폴백된다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const hadMetaEnv = Object.hasOwn(testGlobal, "__WINTR_IMPORT_META_ENV__");
		const prevMetaEnv = testGlobal.__WINTR_IMPORT_META_ENV__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		testGlobal.__WINTR_IMPORT_META_ENV__ = { BASE_URL: "/" };
		vi.stubGlobal("process", {
			env: { BASE_URL: "" },
		} as unknown as NodeJS.Process);
		try {
			expect(normalizeImageSrc("/blog/images/a.png")).toBe("/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			if (hadMetaEnv) {
				testGlobal.__WINTR_IMPORT_META_ENV__ = prevMetaEnv;
			} else {
				delete testGlobal.__WINTR_IMPORT_META_ENV__;
			}
		}
	});

	test("process.env가 없으면 예외 없이 동작한다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		vi.stubGlobal("process", { env: undefined } as unknown as NodeJS.Process);
		try {
			expect(() => normalizeImageSrc("images/a.png")).not.toThrow();
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
		}
	});

	test("__WINTR_IMPORT_META_ENV__ BASE_URL이 있으면 이를 사용한다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const hadMetaEnv = Object.hasOwn(testGlobal, "__WINTR_IMPORT_META_ENV__");
		const prevMetaEnv = testGlobal.__WINTR_IMPORT_META_ENV__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		vi.stubGlobal("process", {
			env: { BASE_URL: undefined },
		} as unknown as NodeJS.Process);
		try {
			testGlobal.__WINTR_IMPORT_META_ENV__ = { BASE_URL: "/m/" };
			expect(normalizeImageSrc("images/a.png")).toBe("/m/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			if (hadMetaEnv) {
				testGlobal.__WINTR_IMPORT_META_ENV__ = prevMetaEnv;
			} else {
				delete testGlobal.__WINTR_IMPORT_META_ENV__;
			}
		}
	});

	test("__WINTR_IMPORT_META_ENV__ BASE_URL이 빈 문자열이면 '/'로 폴백된다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const hadMetaEnv = Object.hasOwn(testGlobal, "__WINTR_IMPORT_META_ENV__");
		const prevMetaEnv = testGlobal.__WINTR_IMPORT_META_ENV__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		vi.stubGlobal("process", {
			env: { BASE_URL: undefined },
		} as unknown as NodeJS.Process);
		try {
			testGlobal.__WINTR_IMPORT_META_ENV__ = { BASE_URL: "" };
			expect(normalizeImageSrc("/blog/images/a.png")).toBe("/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			if (hadMetaEnv) {
				testGlobal.__WINTR_IMPORT_META_ENV__ = prevMetaEnv;
			} else {
				delete testGlobal.__WINTR_IMPORT_META_ENV__;
			}
		}
	});

	test("__WINTR_IMPORT_META_ENV__ BASE_URL이 string이 아니면 무시한다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const hadMetaEnv = Object.hasOwn(testGlobal, "__WINTR_IMPORT_META_ENV__");
		const prevMetaEnv = testGlobal.__WINTR_IMPORT_META_ENV__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		vi.stubGlobal("process", {
			env: { BASE_URL: undefined },
		} as unknown as NodeJS.Process);
		try {
			testGlobal.__WINTR_IMPORT_META_ENV__ = { BASE_URL: ["x"] };
			expect(() => normalizeImageSrc("images/a.png")).not.toThrow();
			expect(normalizeImageSrc("images/a.png")).toBe("/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			if (hadMetaEnv) {
				testGlobal.__WINTR_IMPORT_META_ENV__ = prevMetaEnv;
			} else {
				delete testGlobal.__WINTR_IMPORT_META_ENV__;
			}
		}
	});

	test("__WINTR_IMPORT_META_ENV__가 undefined면 '/'로 폴백된다", () => {
		const prevBase = testGlobal.__WINTR_BASE_URL__;
		const prevEnvBase = testGlobal.__WINTR_ENV_BASE_URL__;
		const hadMetaEnv = Object.hasOwn(testGlobal, "__WINTR_IMPORT_META_ENV__");
		const prevMetaEnv = testGlobal.__WINTR_IMPORT_META_ENV__;
		testGlobal.__WINTR_BASE_URL__ = undefined;
		testGlobal.__WINTR_ENV_BASE_URL__ = undefined;
		vi.stubGlobal("process", {
			env: { BASE_URL: undefined },
		} as unknown as NodeJS.Process);
		try {
			testGlobal.__WINTR_IMPORT_META_ENV__ = undefined;
			expect(normalizeImageSrc("/blog/images/a.png")).toBe("/images/a.png");
		} finally {
			vi.unstubAllGlobals();
			testGlobal.__WINTR_BASE_URL__ = prevBase;
			testGlobal.__WINTR_ENV_BASE_URL__ = prevEnvBase;
			if (hadMetaEnv) {
				testGlobal.__WINTR_IMPORT_META_ENV__ = prevMetaEnv;
			} else {
				delete testGlobal.__WINTR_IMPORT_META_ENV__;
			}
		}
	});

	test("BASE가 trailing slash가 없어도 정상 결합된다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/x";
		try {
			expect(normalizeImageSrc("images/a.png")).toBe("/x/images/a.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("BASE가 다른 경우 root-relative는 leading slash를 제거 후 결합된다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/x/";
		try {
			expect(normalizeImageSrc("/images/a.png")).toBe("/x/images/a.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("blog 프리픽스는 경로 시작에서만 제거된다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/";
		try {
			expect(normalizeImageSrc("a/blog/test.png")).toBe("/a/blog/test.png");
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
	});

	test("Legacy assets 폴더가 2자리 숫자가 아니면 filename만 남는다", () => {
		const prev = testGlobal.__WINTR_BASE_URL__;
		testGlobal.__WINTR_BASE_URL__ = "/";
		try {
			expect(normalizeImageSrc("assets/images/012/arch.svg")).toBe(
				"/images/arch.svg",
			);
		} finally {
			testGlobal.__WINTR_BASE_URL__ = prev;
		}
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

	test("월/일은 2자리로 포맷팅된다", () => {
		const result = formatDate("2023-01-02");
		expect(result).toMatch(/2023\.\s*01\.\s*02\./);
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

	test("wordLimit=0이고 공백만 있는 경우 ... 를 붙이지 않는다", () => {
		expect(truncateText("   ", 0)).toBe("");
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
				expect(truncateText(v as unknown as string, 10)).toBe("");
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
				expect(slugify(v as unknown as string)).toBe("");
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

	test('따옴표가 비어있어도 값은 언쿼트된다 (BVA: "")', () => {
		const md = '---\ntitle: ""\n---\n';
		const { data } = parseFrontMatter(md);
		expect(data.title).toBe("");
	});

	test("태그 구분자(쉼표) 및 빈 태그 처리 (EP: Tags Split)", () => {
		const md = "---\ntags: t1,  t2 t3,,t4\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.tags).toEqual(["t1", "t2 t3", "t4"]);
	});

	test("대괄호가 양쪽에 있을 때만 tags 래퍼를 제거해야 한다", () => {
		const wrapped = "---\ntags: [a, b]\n---\n";
		const onlyLeft = "---\ntags: [a, b\n---\n";
		const onlyRight = "---\ntags: a, b]\n---\n";

		expect(parseFrontMatter(wrapped).data.tags).toEqual(["a", "b"]);
		expect(parseFrontMatter(onlyLeft).data.tags).toEqual(["[a", "b"]);
		expect(parseFrontMatter(onlyRight).data.tags).toEqual(["a", "b]"]);
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

	test("PBT: tags는 쉼표 구분자를 기준으로 split 된다", () => {
		const token = fc
			.string({
				unit: fc.constantFrom(
					..."abcdefghijklmnopqrstuvwxyz0123456789_- ".split(""),
				),
				minLength: 1,
				maxLength: 10,
			})
			.filter((s) => !s.includes(","));

		fc.assert(
			fc.property(
				fc.array(token, { minLength: 0, maxLength: 20 }),
				(tokens) => {
					const joined = tokens.join(",,  ");
					const md = `---\ntags: ${joined}\n---\n`;
					const { data } = parseFrontMatter(md);
					const expected = tokens.map((t) => t.trim()).filter(Boolean);
					expect(data.tags).toEqual(expected);
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

	test("PBT: 싱글 쿼트가 짝이 맞지 않으면 값은 그대로 보존된다", () => {
		const raw = fc.string({
			unit: fc.constantFrom(
				..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
			),
			minLength: 1,
			maxLength: 40,
		});

		fc.assert(
			fc.property(raw, (s) => {
				const md = `---\nkey: '${s}\n---\n`;
				const { data } = parseFrontMatter(md);
				expect(data.key).toBe(`'${s}`);
			}),
		);
	});

	test("닫는 더블쿼트만 있으면 언쿼트하지 않는다", () => {
		const md = '---\nkey: a"\n---\n';
		const { data } = parseFrontMatter(md);
		expect(data.key).toBe('a"');
	});

	test("닫는 delimiter가 없으면 FrontMatter로 취급하지 않는다", () => {
		const md = "---\ntitle: a\nBody";
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({});
		expect(content).toBe(md);
	});

	test("delimiter 라인이 정확히 --- 로 시작하지 않으면 파싱하지 않는다", () => {
		const md = "x---\ntitle: a\n---\nBody";
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({});
		expect(content).toBe(md);
	});

	test("delimiter 라인이 ---로 시작하지만 뒤에 문자가 있으면 파싱하지 않는다", () => {
		const md = "---x\ntitle: a\n---\nBody";
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({});
		expect(content).toBe(md);
	});

	test("delimiter 라인 앞 공백이 있으면 파싱하지 않는다", () => {
		const md = " ---\ntitle: a\n---\nBody";
		const { data, content } = parseFrontMatter(md);
		expect(data).toEqual({});
		expect(content).toBe(md);
	});

	test("키가 #로 끝나도 주석이 아니다", () => {
		const md = "---\na#: 1\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data["a#"]).toBe(1);
	});

	test("앞에 공백이 있어도 #으로 시작하면 주석으로 무시된다", () => {
		const md = "---\n  #a: 1\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data).toEqual({});
	});

	test("앞에 공백이 있는 : 라인은 무시된다", () => {
		const md = "---\n  : 1\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data).toEqual({});
	});

	test("값이 단일 따옴표 문자면 그대로 유지된다", () => {
		const md = '---\nkey: "\n---\n';
		const { data } = parseFrontMatter(md);
		expect(data.key).toBe('"');
	});

	test("값이 2글자이고 따옴표로 감싸지지 않으면 그대로 유지된다", () => {
		const md = "---\nkey: ab\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.key).toBe("ab");
	});

	test("double로 시작하고 single로 끝나는 값은 언쿼트되지 않는다", () => {
		const md = "---\nkey: \"a'\n---\n";
		const { data } = parseFrontMatter(md);
		expect(data.key).toBe("\"a'");
	});

	test("body의 줄바꿈은 보존된다", () => {
		const md = "---\ntitle: a\n---\na\nb\n";
		const { content } = parseFrontMatter(md);
		expect(content).toBe("a\nb");
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

describe("language selection (navigator.language only)", () => {
	test("public/404.html은 navigator.languages를 참조하지 않는다", () => {
		const content = fs.readFileSync(
			path.join(process.cwd(), "public", "404.html"),
			"utf-8",
		);
		expect(content).toContain("navigator.language");
		expect(content).not.toContain("navigator.languages");
	});

	test("scripts/build-github.ts는 /en 레거시 selectorHtml에 의존하지 않는다", () => {
		const content = fs.readFileSync(
			path.join(process.cwd(), "scripts", "build-github.ts"),
			"utf-8",
		);
		expect(content).not.toContain("legacyEnHtml");
		expect(content).not.toContain("navigator.languages");
	});
});
