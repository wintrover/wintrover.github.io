import fc from "fast-check";
import { get } from "svelte/store";
import { describe, expect, test, vi } from "vitest";
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
		const mockPosts = [{ title: "Post 1" }, { title: "Post 2" }];
		vi.mocked(postLoader.loadAllPosts).mockResolvedValue(mockPosts);

		// store를 import (모킹된 loadAllPosts 사용)
		const { posts } = await import("../src/stores/posts");

		// subscribe를 통해 데이터 업데이트 확인
		let data: any[] = [];
		const unsubscribe = posts.subscribe((v) => {
			data = v;
		});

		// Promise 비동기 처리를 위해 대기
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(data).toEqual(mockPosts);
		unsubscribe();
	});

	test("loadAllPosts 실패 시 빈 배열을 반환해야 함", async () => {
		vi.mocked(postLoader.loadAllPosts).mockRejectedValue(
			new Error("Fetch error"),
		);
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const { posts } = await import("../src/stores/posts");

		let data: any[] = [1]; // 초기값이 아님을 확인하기 위해
		const unsubscribe = posts.subscribe((v) => {
			data = v;
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(data).toEqual([]);
		expect(consoleSpy).toHaveBeenCalledWith(
			"[postsStore] Failed to load posts:",
			expect.any(Error),
		);
		unsubscribe();
		consoleSpy.mockRestore();
	});
});
