import fc from "fast-check";
import { get } from "svelte/store";
import { describe, expect, test, vi } from "vitest";
import type { Post } from "../src/lib/postLoader";
import * as postLoader from "../src/lib/postLoader";
import { selectedCategory } from "../src/stores/category";

// posts store는 import 시점에 loadAllPosts를 실행하므로 모킹을 먼저 해야 함
vi.mock("../src/lib/postLoader", () => ({
	loadAllPosts: vi.fn(),
}));

describe("selectedCategory store", () => {
	test("초기값은 'all'이어야 함", () => {
		expect(get(selectedCategory)).toBe("all");
	});

	test("값을 변경할 수 있어야 함", () => {
		selectedCategory.set("project");
		expect(get(selectedCategory)).toBe("project");
	});

	test("PBT: 임의의 문자열로도 값을 변경할 수 있어야 함", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.constant("all"),
					fc.string({
						unit: fc.constantFrom(
							..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
						),
						minLength: 1,
						maxLength: 20,
					}),
				),
				(value) => {
					selectedCategory.set(value);
					expect(get(selectedCategory)).toBe(value);
				},
			),
			{ numRuns: 50 },
		);
	});
});

describe("posts store", () => {
	test("loadAllPosts 성공 시 데이터를 로드해야 함", async () => {
		const mockPosts = [
			{
				fileName: "post-1",
				slug: "post-1",
				title: "Post 1",
				date: "2023-10-01",
				category: "",
				tags: [],
				excerpt: "",
				html: "",
				content: "",
			},
			{
				fileName: "post-2",
				slug: "post-2",
				title: "Post 2",
				date: "2023-10-02",
				category: "",
				tags: [],
				excerpt: "",
				html: "",
				content: "",
			},
		] satisfies Post[];
		vi.mocked(postLoader.loadAllPosts).mockResolvedValue(mockPosts);

		const { ensurePostsLoaded, posts } = await import("../src/stores/posts");

		// subscribe를 통해 데이터 업데이트 확인
		let data: Post[] = [];
		const unsubscribe = posts.subscribe((v) => {
			data = v;
		});

		await ensurePostsLoaded();

		expect(data).toEqual(mockPosts);
		unsubscribe();
	});

	test("loadAllPosts 실패 시 빈 배열을 반환해야 함", async () => {
		vi.mocked(postLoader.loadAllPosts).mockRejectedValue(
			new Error("Fetch error"),
		);
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const { ensurePostsLoaded, posts } = await import("../src/stores/posts");

		let data: unknown[] = [1]; // 초기값이 아님을 확인하기 위해
		const unsubscribe = posts.subscribe((v) => {
			data = v;
		});

		await ensurePostsLoaded();

		expect(data).toEqual([]);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("❌ [postsStore] 포스트 로딩 실패"),
			expect.objectContaining({
				error: expect.any(Error),
				message: "Fetch error",
			}),
		);
		unsubscribe();
		consoleSpy.mockRestore();
	});
});
