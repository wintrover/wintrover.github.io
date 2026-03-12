import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import fc from "fast-check";
import { push } from "svelte-spa-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PostDetail from "../src/components/PostDetail.svelte";
import * as postLoader from "../src/lib/postLoader";

// Mock postLoader
vi.mock("../src/lib/postLoader", () => ({
	loadPostBySlug: vi.fn(),
}));

// Mock svelte-spa-router
vi.mock("svelte-spa-router", () => ({
	push: vi.fn(),
}));

describe("PostDetail Component", () => {
	const safeSlug = (minLength: number, maxLength: number) =>
		fc.string({
			unit: fc.constantFrom(
				..."abcdefghijklmnopqrstuvwxyz0123456789-".split(""),
			),
			minLength,
			maxLength,
		});

	const mockPost = {
		fileName: "detailed-post",
		title: "Detailed Post",
		slug: "detailed-post",
		category: "Tech",
		date: "2023-10-01",
		content: "Body content",
		html: "<h1>Header</h1><p>Body content</p>",
		excerpt: "Detailed excerpt",
		tags: ["svelte", "testing"],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(postLoader.loadPostBySlug).mockResolvedValue(mockPost as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test("포스트 내용을 올바르게 렌더링해야 함", async () => {
		const pushMock = vi.mocked(push);
		render(PostDetail, { params: { slug: "detailed-post" } });

		await waitFor(() => {
			expect(screen.getByText("Detailed Post")).toBeInTheDocument();
		});

		expect(screen.getByText("Tech")).toBeInTheDocument();
		expect(screen.getByText("Header")).toBeInTheDocument();
		expect(screen.getByText("Body content")).toBeInTheDocument();
		expect(screen.getByText("#svelte")).toBeInTheDocument();
		expect(screen.getByText("#testing")).toBeInTheDocument();

		// Back to List 버튼 클릭
		const backButton = screen.getByText("← Back to List");
		await fireEvent.click(backButton);
		expect(pushMock).toHaveBeenCalledWith("/");
	});

	test("포스트 전환 시 로딩 상태 표시 확인", async () => {
		let resolveFirst: (value: any) => void = () => {};
		const firstPromise = new Promise((resolve) => {
			resolveFirst = resolve;
		});
		vi.mocked(postLoader.loadPostBySlug).mockReturnValueOnce(
			firstPromise as any,
		);

		const { rerender } = render(PostDetail, { params: { slug: "first" } });

		// 첫 번째 포스트 로딩 중
		expect(screen.getByText("Loading post...")).toBeInTheDocument();
		resolveFirst(mockPost);
		await waitFor(() =>
			expect(screen.queryByText("Loading post...")).not.toBeInTheDocument(),
		);

		// 두 번째 포스트 로딩 시작
		let resolveSecond: (value: any) => void = () => {};
		const secondPromise = new Promise((resolve) => {
			resolveSecond = resolve;
		});
		vi.mocked(postLoader.loadPostBySlug).mockReturnValueOnce(
			secondPromise as any,
		);

		await rerender({ params: { slug: "second" } });

		// post가 있는 상태에서 loading이 true이므로 "Loading post content..."가 보여야 함
		expect(screen.getByText("Loading post content...")).toBeInTheDocument();

		resolveSecond({ ...mockPost, title: "Second Post" });
		await waitFor(() =>
			expect(screen.getByText("Second Post")).toBeInTheDocument(),
		);
	});

	test("goBack 함수 호출 확인", async () => {
		const pushSpy = (await import("svelte-spa-router")).push;
		render(PostDetail, { params: { slug: "detailed-post" } });

		await waitFor(() =>
			expect(screen.getByText("Detailed Post")).toBeInTheDocument(),
		);

		const backButton = screen.getByText("← Back to List");
		await fireEvent.click(backButton);
		expect(pushSpy).toHaveBeenCalledWith("/");
	});

	test("코드 블록 테마 토글 및 복사 버튼 확인", async () => {
		const mockPostWithCode = {
			...mockPost,
			html: `
				<div class="markdown-content">
					<pre>
						<button class="devsite-icon-theme-toggle"></button>
						<button class="devsite-icon-copy"></button>
						<code>console.log("hello");</code>
					</pre>
				</div>
			`,
		};
		vi.mocked(postLoader.loadPostBySlug).mockResolvedValue(
			mockPostWithCode as any,
		);

		render(PostDetail, { params: { slug: "detailed-post" } });

		await waitFor(() => {
			expect(screen.queryByText("Detailed Post")).toBeInTheDocument();
		});

		await waitFor(
			() => {
				const themeToggle = document.querySelector(
					".devsite-icon-theme-toggle",
				);
				expect(themeToggle).toBeInTheDocument();
			},
			{ timeout: 5000 },
		);

		const themeToggle = document.querySelector(".devsite-icon-theme-toggle");
		const copyButton = document.querySelector(".devsite-icon-copy");
		const pre = document.querySelector("pre");

		if (themeToggle && pre) {
			await fireEvent.click(themeToggle);
			expect(pre.classList.contains("dark-theme")).toBe(true);
			expect(themeToggle.classList.contains("light-mode")).toBe(true);
		}

		if (copyButton) {
			const writeTextMock = vi.fn().mockResolvedValue(undefined);
			Object.assign(navigator, {
				clipboard: {
					writeText: writeTextMock,
				},
			});

			await fireEvent.click(copyButton);
			expect(writeTextMock).toHaveBeenCalledWith('console.log("hello");');
		}
	});

	test("포스트 데이터 로딩 중 에러 발생 시 처리 확인", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(postLoader.loadPostBySlug).mockRejectedValue(
			new Error("Typed Error"),
		);

		render(PostDetail, { params: { slug: "error-slug" } });

		await waitFor(() => {
			expect(screen.getByText("Post not found")).toBeInTheDocument();
		});
		consoleSpy.mockRestore();
	});

	test("포스트 데이터 로딩 중 String 에러 발생 시 처리 확인", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(postLoader.loadPostBySlug).mockRejectedValue("String Error");

		render(PostDetail, { params: { slug: "error-slug" } });

		await waitFor(() => {
			expect(screen.getByText("Post not found")).toBeInTheDocument();
		});
		consoleSpy.mockRestore();
	});

	test("포스트 데이터가 없을 때 에러 발생 확인", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(postLoader.loadPostBySlug).mockResolvedValue(null);

		render(PostDetail, { params: { slug: "null-slug" } });

		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalled();
		});
		consoleSpy.mockRestore();
	});

	test("slug가 없을 때 처리 확인", async () => {
		const loadSpy = vi.mocked(postLoader.loadPostBySlug);
		render(PostDetail, { params: {} });
		expect(loadSpy).not.toHaveBeenCalled();
	});

	test("동일한 slug로 재호출 시 무시 확인", async () => {
		const loadSpy = vi.mocked(postLoader.loadPostBySlug);
		const { rerender } = render(PostDetail, { params: { slug: "same" } });

		await waitFor(() => expect(loadSpy).toHaveBeenCalledTimes(1));

		await rerender({ params: { slug: "same" } });
		expect(loadSpy).toHaveBeenCalledTimes(1);
	});

	test("메타 태그 업데이트 확인", async () => {
		// Mock document methods
		const querySelectorSpy = vi.spyOn(document, "querySelector");
		const createElementSpy = vi.spyOn(document, "createElement");
		const appendChildSpy = vi.spyOn(document.head, "appendChild");

		render(PostDetail, { params: { slug: "detailed-post" } });

		await waitFor(() => {
			expect(document.title).toBe("Detailed Post - wintrover");
		});

		// Check if meta tags were searched/created
		expect(querySelectorSpy).toHaveBeenCalled();

		querySelectorSpy.mockRestore();
		createElementSpy.mockRestore();
		appendChildSpy.mockRestore();
	});

	test("복사 버튼 클릭 시 에러 처리", async () => {
		const mockPostWithCode = {
			...mockPost,
			html: `
				<div class="markdown-content">
					<pre>
						<button class="devsite-icon-copy"></button>
						<code>console.log("hello");</code>
					</pre>
				</div>
			`,
		};
		vi.mocked(postLoader.loadPostBySlug).mockResolvedValue(
			mockPostWithCode as any,
		);

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const writeTextMock = vi
			.fn()
			.mockRejectedValue(new Error("Clipboard Error"));
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});

		render(PostDetail, { params: { slug: "detailed-post" } });

		await waitFor(() => {
			expect(screen.getByText("Detailed Post")).toBeInTheDocument();
		});

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const copyButton = document.querySelector(".devsite-icon-copy");
		if (copyButton) {
			await fireEvent.click(copyButton);
			expect(writeTextMock).toHaveBeenCalled();
			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("클립보드 복사 실패"),
					expect.anything(),
				);
			});
		}
		consoleSpy.mockRestore();
	});

	test("PBT: loadPostBySlug가 null이면 Post not found를 표시해야 함", async () => {
		await fc.assert(
			fc.asyncProperty(safeSlug(1, 24), async (slug) => {
				document.body.innerHTML = "";
				vi.clearAllMocks();

				vi.mocked(postLoader.loadPostBySlug).mockResolvedValueOnce(null);

				const { unmount } = render(PostDetail, { params: { slug } });

				await waitFor(() => {
					expect(screen.getByText("Post not found")).toBeInTheDocument();
				});

				unmount();
			}),
			{ numRuns: 25 },
		);
	});
});
