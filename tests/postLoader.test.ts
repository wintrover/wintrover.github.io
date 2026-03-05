import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";
import { loadAllPosts, loadPostBySlug } from "../src/lib/postLoader";

describe("postLoader", () => {
	test("loadAllPosts - 모든 포스트를 로드하고 날짜순으로 정렬해야 함", async () => {
		const posts = await loadAllPosts();
		expect(Array.isArray(posts)).toBe(true);
		expect(posts.length).toBeGreaterThan(0);

		// 날짜순 정렬 확인
		for (let i = 0; i < posts.length - 1; i++) {
			const current = new Date(posts[i].date).getTime();
			const next = new Date(posts[i + 1].date).getTime();
			expect(current).toBeGreaterThanOrEqual(next);
		}
	});

	test("loadPostBySlug - 슬러그로 특정 포스트를 로드해야 함", async () => {
		const allPosts = await loadAllPosts();
		const targetPost = allPosts[0];

		const post = await loadPostBySlug(targetPost.slug);
		expect(post).not.toBeNull();
		expect(post?.slug).toBe(targetPost.slug);
		expect(post?.title).toBe(targetPost.title);
	});

	test("PBT: loadAllPosts는 date 기준 내림차순으로 정렬되어야 함", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uniqueArray(fc.integer({ min: 0, max: 20000 }), {
					minLength: 2,
					maxLength: 12,
				}),
				async (dayOffsets) => {
					const base = new Date("2000-01-01T00:00:00.000Z").getTime();
					const modules: Record<string, string> = {};

					for (let i = 0; i < dayOffsets.length; i++) {
						const date = new Date(base + dayOffsets[i] * 24 * 60 * 60 * 1000)
							.toISOString()
							.split("T")[0];
						modules[`posts/p${i}.md`] =
							`---\ntitle: p${i}\ndate: ${date}\n---\nBody ${i}`;
					}

					const posts = await loadAllPosts(modules);
					expect(posts).toHaveLength(dayOffsets.length);

					for (let i = 0; i < posts.length - 1; i++) {
						const current = new Date(posts[i].date).getTime();
						const next = new Date(posts[i + 1].date).getTime();
						expect(current).toBeGreaterThanOrEqual(next);
					}
				},
			),
			{ numRuns: 50 },
		);
	});

	test("Metadata fallback logic - All cases for coverage", async () => {
		const mockModules = {
			"posts/test.md": "---\n---",
		};

		const posts = await loadAllPosts(mockModules);
		expect(posts[0].title).toBe("test");
		expect(posts[0].fileName).toBe("test");
		expect(posts[0].date).toBe(new Date().toISOString().split("T")[0]);
		expect(posts[0].category).toBe("General");
		expect(posts[0].tags).toEqual([]);
		expect(posts[0].excerpt).toBe("");
	});

	test("Metadata fallback logic - specific fields", async () => {
		const mockModules = {
			"posts/test.md":
				"---\ntitle: Title\ndate: 2023-01-01\ncategory: Cat\ntags: [a, b]\nexcerpt: Excerpt\n---",
		};

		const posts = await loadAllPosts(mockModules);
		expect(posts[0].title).toBe("Title");
		expect(posts[0].date).toBe("2023-01-01");
		expect(posts[0].category).toBe("Cat");
		expect(posts[0].tags).toEqual(["a", "b"]);
		expect(posts[0].excerpt).toBe("Excerpt");
	});

	test("loadPostBySlug - 메타데이터 폴백 확인 (Line 120-138 coverage)", async () => {
		const mockModules = {
			"posts/test.md": "---\n---",
		};

		const post = await loadPostBySlug("test", mockModules);
		expect(post).not.toBeNull();
		expect(post?.title).toBe("test");
	});

	test("loadPostBySlug - 에러 핸들링 (Catch block coverage)", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		// 강제로 에러를 내기 위해 잘못된 데이터 구조를 전달.
		const post = await loadPostBySlug("slug", null as any);
		expect(post).toBeNull();
		warnSpy.mockRestore();
	});

	test("loadAllPosts - 치명적 에러 핸들링 (Catch block coverage)", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		// Object.entries를 모킹하여 에러 발생 유도
		const spy = vi.spyOn(Object, "entries").mockImplementationOnce(() => {
			throw new Error("Critical Error");
		});

		const posts = await loadAllPosts();
		expect(posts).toEqual([]);
		spy.mockRestore();
		errorSpy.mockRestore();
	});

	test("determineCategoryFromPath - all categories", async () => {
		const mockModules = {
			"../posts/project/a.md": "---\ntitle: a\n---",
			"../posts/company/b.md": "---\ntitle: b\n---",
			"../posts/tutorial/c.md": "---\ntitle: c\n---",
			"../posts/general/d.md": "---\ntitle: d\n---",
			"../posts/unknown/e.md": "---\ntitle: e\n---",
		};

		const posts = await loadAllPosts(mockModules);
		expect(posts.find((p) => p.fileName === "a").category).toBe("Project");
		expect(posts.find((p) => p.fileName === "b").category).toBe("Company Work");
		expect(posts.find((p) => p.fileName === "c").category).toBe("Tutorial");
		expect(posts.find((p) => p.fileName === "d").category).toBe("General");
		expect(posts.find((p) => p.fileName === "e").category).toBe("General");
	});

	test("fileName fallback logic - processPostMetadata", async () => {
		const originalSplit = String.prototype.split;
		const spy = vi
			.spyOn(String.prototype, "split")
			.mockImplementation(function (this: string, ...args: any[]) {
				const separator = args[0];
				if (this === "special-path-for-mock") {
					return { pop: () => undefined } as any;
				}
				return originalSplit.call(this, separator);
			});

		const posts = await loadAllPosts({
			"special-path-for-mock": "---\ntitle: t\n---",
		});
		expect(posts[0].fileName).toBe("");

		spy.mockRestore();
	});

	test("loadPostBySlug - fileName and slugify fallback coverage", async () => {
		// 1. fileName fallback to empty string (path.split("/").pop() is undefined)
		const originalSplit = String.prototype.split;
		const spy = vi
			.spyOn(String.prototype, "split")
			.mockImplementation(function (this: string, ...args: any[]) {
				const separator = args[0];
				if (this === "special-path-for-mock") {
					return { pop: () => undefined } as any;
				}
				return originalSplit.call(this, separator);
			});

		// slugify(data.title || fileName || "") -> slugify("t" || "" || "") -> "t"
		// This will find the post with slug "t"
		const post = await loadPostBySlug("t", {
			"special-path-for-mock": "---\ntitle: t\n---",
		});
		expect(post?.fileName).toBe("");
		spy.mockRestore();

		// 2. slugify fallback to empty string (title and fileName both empty)
		const mockMeta = {
			".md": '---\ntitle: ""\n---',
		};
		const postEmpty = await loadPostBySlug("", mockMeta);
		expect(postEmpty?.slug).toBe("");
	});

	test("loadPostBySlug - null and undefined content skip", async () => {
		const mockModules = {
			"a.md": null,
			"b.md": undefined,
			"c.md": "---\ntitle: c\n---",
		};
		const post = await loadPostBySlug("c", mockModules as any);
		expect(post?.title).toBe("c");
	});

	test("loadPostBySlug - not found and fallback branches", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		// 1. Not found (hits target === null)
		const post = await loadPostBySlug("non-existent", { "test.md": "content" });
		expect(post).toBeNull();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				"해당 슬러그에 대한 포스트를 찾을 수 없음: non-existent",
			),
		);

		warnSpy.mockRestore();
	});

	test("slugify title fallback mutant", async () => {
		// Test case for slugify(data.title || fileName || "")
		// Case where data.title is missing and fileName is used
		const mockModules = {
			"posts/test-file.md": "---\nexcerpt: ex\n---",
		};
		const posts = await loadAllPosts(mockModules);
		expect(posts[0].slug).toBe("test-file");
	});

	test("Error handling during parsing - Non-Error object", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		// This test will hit the catch block in loadAllPosts's loop
		// We need to mock parseFrontMatter to throw a non-Error object
		const mockModules = {
			"error.md": "invalid",
		};

		// We need to use a real parseFrontMatter but make it throw
		// Or we can just mock the whole modules loop behavior if possible
		// Since we're using real files or passed modules, let's mock parseFrontMatter
		const utils = await import("../src/lib/utils");
		vi.spyOn(utils, "parseFrontMatter").mockImplementationOnce(() => {
			throw "String Error";
		});

		await loadAllPosts(mockModules);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("포스트 파싱 중 에러 발생"),
			expect.objectContaining({
				message: "String Error",
				stack: "Stack trace unavailable",
			}),
		);

		errorSpy.mockRestore();
		vi.restoreAllMocks();
	});

	test("Error handling during parsing - Error object", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const mockModules = {
			"error.md": "invalid",
		};

		const utils = await import("../src/lib/utils");
		vi.spyOn(utils, "parseFrontMatter").mockImplementationOnce(() => {
			const err = new Error("Real Error");
			err.stack = "Mock Stack";
			throw err;
		});

		await loadAllPosts(mockModules);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("포스트 파싱 중 에러 발생"),
			expect.objectContaining({
				message: "Real Error",
				stack: "Mock Stack",
			}),
		);

		errorSpy.mockRestore();
		vi.restoreAllMocks();
	});

	test("loadAllPosts - modulesOverride가 없을 때 기본 postFiles 사용 확인", async () => {
		const posts = await loadAllPosts();
		expect(posts.length).toBeGreaterThan(0);
	});

	test("loadPostBySlug - modulesOverride가 없을 때 기본 postFiles 사용 확인", async () => {
		const allPosts = await loadAllPosts();
		const post = await loadPostBySlug(allPosts[0].slug);
		expect(post).not.toBeNull();
	});

	test("Error handling in loadAllPosts - Critical Error via sort", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const mockModules = {
			"a.md": "---\ndate: 2023-01-01\n---",
			"b.md": "---\ndate: 2023-01-02\n---",
		};

		// Mock Date.getTime to throw an Error
		const originalGetTime = Date.prototype.getTime;
		vi.spyOn(Date.prototype, "getTime").mockImplementationOnce(() => {
			throw new Error("Sort Crash");
		});

		const posts = await loadAllPosts(mockModules);
		expect(posts.length).toBeGreaterThan(0); // Should still return unsorted or partially sorted list
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("포스트 정렬 중 에러 발생"),
			expect.objectContaining({
				message: "Sort Crash",
			}),
		);

		Date.prototype.getTime = originalGetTime;
		errorSpy.mockRestore();
		vi.restoreAllMocks();
	});

	test("Error handling in loadAllPosts - Critical Non-Error via sort", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const mockModules = {
			"a.md": "---\ndate: 2023-01-01\n---",
			"b.md": "---\ndate: 2023-01-02\n---",
		};

		const originalGetTime = Date.prototype.getTime;
		vi.spyOn(Date.prototype, "getTime").mockImplementationOnce(() => {
			throw "Sort Crash String";
		});

		const posts = await loadAllPosts(mockModules);
		expect(posts.length).toBeGreaterThan(0);
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("포스트 정렬 중 에러 발생"),
			expect.objectContaining({
				message: "Sort Crash String",
				stack: "Stack trace unavailable",
			}),
		);

		Date.prototype.getTime = originalGetTime;
		errorSpy.mockRestore();
		vi.restoreAllMocks();
	});
});
