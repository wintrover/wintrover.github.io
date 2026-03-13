import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Post } from "../src/lib/postLoader";
import HomePage from "../src/routes/+page.svelte";

const { mockEnsurePostsLoaded, mockPush, mockPostsStore } = vi.hoisted(() => {
	let value: Post[] = [];
	const subscribers = new Set<(posts: Post[]) => void>();
	const store = {
		subscribe(run: (posts: Post[]) => void) {
			run(value);
			subscribers.add(run);
			return () => subscribers.delete(run);
		},
		set(next: Post[]) {
			value = next;
			subscribers.forEach((run) => {
				run(value);
			});
		},
	};

	return {
		mockEnsurePostsLoaded: vi.fn(() => Promise.resolve([])),
		mockPush: vi.fn(),
		mockPostsStore: store,
	};
});

vi.mock("../src/stores/posts", () => ({
	posts: mockPostsStore,
	ensurePostsLoaded: mockEnsurePostsLoaded,
}));

vi.mock("svelte-spa-router", () => ({
	push: mockPush,
}));

describe("HomePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPostsStore.set([]);
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			configurable: true,
			value: vi.fn(),
		});
	});

	test("포스트와 프로젝트 섹션을 렌더링해야 함", async () => {
		mockPostsStore.set([
			{
				fileName: "feature-project",
				slug: "feature-project",
				title: "Feature Project",
				date: "2024-10-03",
				category: "Project",
				tags: [],
				excerpt: "Build notes",
				folder: "project",
				html: "<p>Build notes</p>",
				content: "Build notes and delivery details",
			},
			{
				fileName: "general-post",
				slug: "general-post",
				title: "General Post",
				date: "2024-10-04",
				category: "General",
				tags: [],
				excerpt: "General notes",
				folder: "general",
				html: "<p>General notes</p>",
				content: "General notes",
			},
		]);

		render(HomePage);

		expect(
			(await screen.findAllByText("Feature Project")).length,
		).toBeGreaterThan(0);

		expect(mockEnsurePostsLoaded).toHaveBeenCalled();
		expect(screen.getByText("Featured project posts")).toBeInTheDocument();
		expect(
			screen.getByText("Building products with shipping discipline"),
		).toBeInTheDocument();
	});

	test("네브바 버튼 동작이 올바르게 연결되어야 함", async () => {
		mockPostsStore.set([
			{
				fileName: "project-a",
				slug: "project-a",
				title: "Project A",
				date: "2024-11-01",
				category: "Project",
				tags: [],
				excerpt: "Excerpt",
				folder: "project",
				html: "<p>Excerpt</p>",
				content: "Excerpt",
			},
		]);

		render(HomePage);

		await fireEvent.click(screen.getByRole("button", { name: "Posts" }));
		await fireEvent.click(screen.getByRole("button", { name: "Projects" }));
		await fireEvent.click(screen.getByRole("button", { name: "About" }));
		await fireEvent.click(screen.getByRole("button", { name: "Resume" }));

		expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(3);
		expect(mockPush).toHaveBeenCalledWith("/resume");
	});

	test("포스트 제목 버튼 클릭 시 상세 페이지로 이동해야 함", async () => {
		mockPostsStore.set([
			{
				fileName: "post-1",
				slug: "post-1",
				title: "Post 1",
				date: "2024-12-01",
				category: "General",
				tags: ["SMBholdings"],
				excerpt: "Excerpt 1",
				folder: "general",
				html: "<p>Excerpt 1</p>",
				content: "Excerpt 1",
			},
		]);

		render(HomePage);

		expect(await screen.findByText("SMBholdings")).toBeInTheDocument();

		await fireEvent.click(
			await screen.findByRole("button", { name: "Open Post 1" }),
		);

		expect(mockPush).toHaveBeenCalledWith("/post/post-1");
	});

	test("프로젝트 포스트가 없으면 빈 상태를 표시해야 함", async () => {
		mockPostsStore.set([
			{
				fileName: "general-only",
				slug: "general-only",
				title: "General Only",
				date: "2025-01-01",
				category: "General",
				tags: [],
				excerpt: "Notes",
				folder: "general",
				html: "<p>Notes</p>",
				content: "Notes",
			},
		]);

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByText("No project posts yet.")).toBeInTheDocument();
		});
	});

	test("포스트가 없으면 홈 빈 상태를 표시해야 함", async () => {
		mockPostsStore.set([]);
		render(HomePage);

		await waitFor(() => {
			expect(screen.getByText("No posts found.")).toBeInTheDocument();
		});
	});

	test("섹션이 없을 때 네브바 스크롤은 무시되어야 함", async () => {
		mockPostsStore.set([]);
		render(HomePage);

		await fireEvent.click(screen.getByRole("button", { name: "Posts" }));
		await fireEvent.click(screen.getByRole("button", { name: "Projects" }));
		await fireEvent.click(screen.getByRole("button", { name: "About" }));

		expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
	});
});
