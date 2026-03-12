import { fireEvent, render, screen } from "@testing-library/svelte";
import fc from "fast-check";
import { get, writable } from "svelte/store";
import { push } from "svelte-spa-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Post } from "../src/lib/postLoader";
import { selectedCategory } from "../src/stores/category";

// Mock the posts store
vi.mock("../src/stores/posts", () => ({
	posts: writable<Post[]>([]),
}));

// Now import Sidebar and posts (mocked)
import Sidebar from "../src/components/Sidebar.svelte";
import { posts } from "../src/stores/posts";

// Mock svelte-spa-router
vi.mock("svelte-spa-router", () => ({
	push: vi.fn(),
}));

describe("Sidebar Component", () => {
	const safeText = (minLength: number, maxLength: number) =>
		fc.string({
			unit: fc.constantFrom(
				..."abcdefghijklmnopqrstuvwxyz0123456789_-".split(""),
			),
			minLength,
			maxLength,
		});

	const mockPosts = [
		{
			fileName: "post-1",
			title: "Post 1",
			category: "Project",
			tags: ["Svelte"],
			slug: "post-1",
			date: "2023-10-01",
			excerpt: "",
			html: "",
			content: "",
		},
		{
			fileName: "post-2",
			title: "Post 2",
			category: "Company Work",
			tags: ["Vitest"],
			slug: "post-2",
			date: "2023-10-02",
			excerpt: "",
			html: "",
			content: "",
		},
		{
			fileName: "post-3",
			title: "Post 3",
			category: "Project",
			tags: ["Svelte"],
			slug: "post-3",
			date: "2023-10-03",
			excerpt: "",
			html: "",
			content: "",
		},
	] satisfies Post[];

	beforeEach(() => {
		posts.set(mockPosts);
		selectedCategory.set("all");
		vi.clearAllMocks();

		// Reset window width
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});
	});

	test("카테고리 목록이 올바르게 표시되어야 함", () => {
		render(Sidebar);

		expect(screen.getByText(/All Posts \(3\)/)).toBeInTheDocument();
		expect(screen.getByText(/Project \(2\)/)).toBeInTheDocument();
		expect(screen.getByText(/Company Work \(1\)/)).toBeInTheDocument();
		expect(screen.getByText(/Svelte \(2\)/)).toBeInTheDocument();
		expect(screen.getByText(/Vitest \(1\)/)).toBeInTheDocument();
		expect(screen.getByText(/SMBholdings \(0\)/)).toBeInTheDocument();
	});

	test("카테고리 클릭 시 selectedCategory가 업데이트되고 경로가 이동해야 함", async () => {
		render(Sidebar);

		const projectButton = screen.getByText(/Project \(2\)/);
		await fireEvent.click(projectButton);

		expect(get(selectedCategory)).toBe("Project");
		expect(push).toHaveBeenCalledWith("/category/project");
	});

	test("All Posts 클릭 시 'all'로 설정되고 홈으로 이동해야 함", async () => {
		(selectedCategory as any).set("Project");
		render(Sidebar);

		const allPostsButton = screen.getByText(/All Posts \(3\)/);
		await fireEvent.click(allPostsButton);

		expect(get(selectedCategory)).toBe("all");
		expect(push).toHaveBeenCalledWith("/");
	});

	test("태그 클릭 시 selectedCategory가 업데이트되고 태그 경로로 이동해야 함", async () => {
		render(Sidebar);

		const tagButton = screen.getByText(/Vitest \(1\)/);
		await fireEvent.click(tagButton);

		expect(get(selectedCategory)).toBe("Company Work - vitest");
		expect(push).toHaveBeenCalledWith("/category/company-work/tag/vitest");
	});

	test("아바타는 링크가 아니고 클릭 시 이동하지 않아야 함", async () => {
		render(Sidebar);

		const avatar = screen.getByAltText(/wintrover/i); // 대소문자 무시
		await fireEvent.click(avatar);

		expect(get(selectedCategory)).toBe("all");
		expect(avatar.closest("a")).toBeNull();
		expect(push).not.toHaveBeenCalled();
	});

	test("resume 링크 클릭 시 resume로 이동해야 함", async () => {
		render(Sidebar);

		const resumeLink = screen.getByRole("link", { name: "resume" });
		await fireEvent.click(resumeLink);

		expect(push).toHaveBeenCalledWith("/resume/");
	});

	test("모바일 환경에서 카테고리 클릭 시 toggle-sidebar 이벤트 발생 확인", async () => {
		// Mock window.innerWidth
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 500,
		});

		const toggleSpy = vi.fn();
		document.addEventListener("toggle-sidebar", toggleSpy);

		render(Sidebar);
		const categoryButton = screen.getByText(/All Posts/i);

		await fireEvent.click(categoryButton);

		expect(toggleSpy).toHaveBeenCalled();

		document.removeEventListener("toggle-sidebar", toggleSpy);
	});

	test("PBT: 카테고리 카운트가 posts와 일치해야 함", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						title: safeText(1, 12),
						category: fc.oneof(
							fc.constant(undefined),
							fc.constant(""),
							fc.constantFrom(
								"Project",
								"Company Work",
								"Tech",
								"Life",
								"General",
							),
						),
						tags: fc.array(safeText(1, 10), {
							maxLength: 4,
						}),
						slug: safeText(1, 12),
					}),
					{ minLength: 0, maxLength: 20 },
				),
				(generated) => {
					document.body.innerHTML = "";
					posts.set(generated as any);
					selectedCategory.set("all");
					vi.clearAllMocks();

					const { unmount } = render(Sidebar);

					expect(
						screen.getByText(new RegExp(`All Posts \\(${generated.length}\\)`)),
					).toBeInTheDocument();

					const counts = new Map<string, number>();
					for (const p of generated as any[]) {
						if (!p.category) continue;
						counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
					}

					for (const [cat, count] of counts.entries()) {
						const escaped = cat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
						expect(
							screen.getByText(new RegExp(`${escaped} \\(${count}\\)`)),
						).toBeInTheDocument();
					}

					unmount();
				},
			),
			{ numRuns: 50 },
		);
	});
});
