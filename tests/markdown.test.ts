import fc from "fast-check";
import { marked } from "marked";
import mermaid from "mermaid";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { initMermaid, loadPost, parseMarkdown } from "../src/lib/markdown";
import { normalizeImageSrc } from "../src/lib/utils";

const originalFetch = global.fetch;

vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
	},
}));

vi.mock("marked", async (importActual) => {
	const actual = await importActual<typeof import("marked")>();
	return {
		...actual,
		marked: {
			...actual.marked,
			parse: vi.fn(),
		},
	};
});

describe("markdown utilities", () => {
	let actualMarkedParse: any;

	beforeAll(async () => {
		const actual = await vi.importActual<typeof import("marked")>("marked");
		actualMarkedParse = actual.marked.parse as any;
	});

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(marked.parse).mockImplementation(actualMarkedParse);
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe("parseMarkdown", () => {
		test("PBT: FrontMatter title는 파싱되고 html은 문자열이다", () => {
			const title = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 40,
				})
				.filter(
					(s) =>
						!s.includes("\n") &&
						!s.includes("\r") &&
						/^[a-z]/i.test(s) &&
						!s.endsWith(" ") &&
						s !== "true" &&
						s !== "false",
				);
			const body = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 80,
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			fc.assert(
				fc.property(title, body, (t, b) => {
					const md = `---\ntitle: ${t}\n---\n${b}`;
					const result = parseMarkdown(md);
					expect(result.frontMatter).toEqual({ title: t });
					expect(typeof result.html).toBe("string");
				}),
			);
		});

		test("PBT: 이미지 src는 normalizeImageSrc 규칙으로 정규화된다", () => {
			const src = fc
				.string()
				.filter(
					(s) =>
						s.length > 0 &&
						!s.includes('"') &&
						!s.includes("'") &&
						!s.includes("<") &&
						!s.includes(">"),
				);

			fc.assert(
				fc.property(src, (s) => {
					vi.mocked(marked.parse).mockImplementation(() => `<img src="${s}">`);
					const md = "---\ntitle: Test\n---\nbody";
					const result = parseMarkdown(md);
					expect(result.html).toContain(`src="${normalizeImageSrc(s)}"`);
				}),
			);
		});

		test("img 태그에 다른 속성이 먼저 와도 src는 정규화된다", () => {
			const s = "assets/images/01/arch.svg";
			vi.mocked(marked.parse).mockImplementation(
				() => `<img   alt="x"   src="${s}"   data-x="y">`,
			);
			const md = "---\ntitle: Test\n---\nbody";
			const result = parseMarkdown(md);
			expect(result.html).toContain(`src="${normalizeImageSrc(s)}"`);
		});

		test("src 주변 공백이 있어도 정규화된다", () => {
			const s = "assets/images/01/arch.svg";
			vi.mocked(marked.parse).mockImplementation(
				() => `<img alt="x" src = '${s}' data-x="y">`,
			);
			const md = "---\ntitle: Test\n---\nbody";
			const result = parseMarkdown(md);
			expect(result.html).toContain(`src='${normalizeImageSrc(s)}'`);
		});

		test("src가 없는 img 태그는 그대로 유지된다", () => {
			vi.mocked(marked.parse).mockImplementation(() => `<img alt="x">`);
			const md = "---\ntitle: Test\n---\nbody";
			const result = parseMarkdown(md);
			expect(result.html).toContain(`<img alt="x">`);
		});

		test("PBT: 파싱 에러 시 Error 객체 메시지가 반환된다", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const msg = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			fc.assert(
				fc.property(msg, (m) => {
					vi.mocked(marked.parse).mockImplementation(() => {
						throw new Error(m);
					});
					const result = parseMarkdown("some content");
					expect(result.frontMatter).toEqual({});
					expect(result.html).toContain(`Error parsing markdown: ${m}`);
					expect(errorSpy).toHaveBeenCalledWith(
						expect.stringContaining("마크다운 파싱 중 에러 발생"),
						expect.objectContaining({
							message: m,
							stack: expect.any(String),
						}),
					);
				}),
			);
			errorSpy.mockRestore();
		});

		test("PBT: 파싱 에러 시 non-Error 값이 문자열화된다", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const msg = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 60,
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			fc.assert(
				fc.property(msg, (m) => {
					vi.mocked(marked.parse).mockImplementation(() => {
						throw m;
					});
					const result = parseMarkdown("some content");
					expect(result.frontMatter).toEqual({});
					expect(result.html).toContain(`Error parsing markdown: ${m}`);
					expect(errorSpy).toHaveBeenCalledWith(
						expect.stringContaining("마크다운 파싱 중 에러 발생"),
						expect.objectContaining({
							message: m,
							stack: "Stack trace unavailable",
						}),
					);
				}),
			);
			errorSpy.mockRestore();
		});
	});

	describe("initMermaid", () => {
		test("PBT: Mermaid는 고정 설정으로 초기화된다", () => {
			fc.assert(
				fc.property(fc.constant(null), () => {
					initMermaid();
					expect(mermaid.initialize).toHaveBeenCalledWith({
						startOnLoad: true,
						theme: "default",
						securityLevel: "loose",
					});
				}),
			);
		});
	});

	describe("loadPost", () => {
		test("filePath가 빈 문자열이면 null을 반환하고 fetch는 호출되지 않는다", async () => {
			global.fetch = vi.fn() as any;
			const result = await loadPost("a", { a: "" });
			expect(result).toBeNull();
			expect(global.fetch).not.toHaveBeenCalled();
		});

		test("filePath가 문자열이 아니면 null을 반환하고 fetch는 호출되지 않는다", async () => {
			global.fetch = vi.fn() as any;
			const result = await loadPost("a", { a: 123 as any });
			expect(result).toBeNull();
			expect(global.fetch).not.toHaveBeenCalled();
		});

		test("존재하지 않는 slug는 null을 반환한다", async () => {
			global.fetch = vi.fn() as any;
			const result = await loadPost("not-exists");
			expect(result).toBeNull();
			expect(global.fetch).not.toHaveBeenCalled();
		});

		test("PBT: 존재하지 않는 슬러그는 null을 반환한다", async () => {
			await fc.assert(
				fc.asyncProperty(fc.string(), async (slug) => {
					global.fetch = vi.fn() as any;
					const result = await loadPost(slug, {});
					expect(result).toBeNull();
					expect(global.fetch).not.toHaveBeenCalled();
				}),
				{ numRuns: 100 },
			);
		});

		test("PBT: 성공적인 로드 시 frontMatter.title이 유지된다", async () => {
			const slug = "../posts/project/2025-06-25-1.md";
			const filePath = "/__test__/post.md";
			const title = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 40,
				})
				.filter(
					(s) =>
						!s.includes("\n") &&
						!s.includes("\r") &&
						/^[a-z]/i.test(s) &&
						!s.endsWith(" ") &&
						s !== "true" &&
						s !== "false",
				);
			const body = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 80,
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			await fc.assert(
				fc.asyncProperty(title, body, async (t, b) => {
					global.fetch = vi.fn().mockResolvedValue({
						ok: true,
						text: () => Promise.resolve(`---\ntitle: ${t}\n---\n${b}`),
					});
					const result = await loadPost(slug, { [slug]: filePath });
					expect(result).not.toBeNull();
					expect(result?.frontMatter.title).toBe(t);
					expect(global.fetch).toHaveBeenCalledWith(filePath);
				}),
				{ numRuns: 50 },
			);
		});

		test("PBT: fetch ok=false 인 경우 null을 반환한다", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const slug = "../posts/project/2025-06-25-1.md";
			const filePath = "/__test__/post.md";
			await fc.assert(
				fc.asyncProperty(fc.integer({ min: 400, max: 599 }), async (status) => {
					global.fetch = vi.fn().mockResolvedValue({
						ok: false,
						status,
						text: () => Promise.resolve("---\ntitle: x\n---\nbody"),
					});
					const result = await loadPost(slug, { [slug]: filePath });
					expect(result).toBeNull();
					expect(errorSpy).toHaveBeenCalledWith(
						expect.stringContaining("포스트 로딩 중 에러 발생"),
						expect.objectContaining({
							slug,
							filePath,
							message: expect.stringContaining(String(status)),
						}),
					);
				}),
				{ numRuns: 50 },
			);
			errorSpy.mockRestore();
		});

		test("PBT: fetch에서 Error 예외가 발생하면 null을 반환한다", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const slug = "../posts/project/2025-06-25-1.md";
			const filePath = "/__test__/post.md";
			const msg = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 60,
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			await fc.assert(
				fc.asyncProperty(msg, async (m) => {
					global.fetch = vi.fn().mockImplementation(() => {
						throw new Error(m);
					});
					const result = await loadPost(slug, { [slug]: filePath });
					expect(result).toBeNull();
					expect(errorSpy).toHaveBeenCalledWith(
						expect.stringContaining("포스트 로딩 중 에러 발생"),
						expect.objectContaining({
							slug,
							filePath,
							message: m,
						}),
					);
				}),
				{ numRuns: 50 },
			);
			errorSpy.mockRestore();
		});

		test("PBT: fetch에서 non-Error 예외가 발생하면 null을 반환한다", async () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const slug = "../posts/project/2025-06-25-1.md";
			const filePath = "/__test__/post.md";
			const msg = fc
				.string({
					unit: fc.constantFrom(
						..."abcdefghijklmnopqrstuvwxyz0123456789 _-".split(""),
					),
					minLength: 1,
					maxLength: 60,
				})
				.filter((s) => !s.includes("\n") && !s.includes("\r"));

			await fc.assert(
				fc.asyncProperty(msg, async (m) => {
					global.fetch = vi.fn().mockImplementation(() => {
						throw m;
					});
					const result = await loadPost(slug, { [slug]: filePath });
					expect(result).toBeNull();
					expect(errorSpy).toHaveBeenCalledWith(
						expect.stringContaining("포스트 로딩 중 에러 발생"),
						expect.objectContaining({
							slug,
							filePath,
							message: m,
							stack: "Stack trace unavailable",
						}),
					);
				}),
				{ numRuns: 50 },
			);
			errorSpy.mockRestore();
		});
	});
});
