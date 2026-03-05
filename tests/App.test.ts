import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/svelte";
import fc from "fast-check";
import { tick } from "svelte";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as postLoader from "../src/lib/postLoader";
import { posts } from "../src/stores/posts";

// Mock the posts store
vi.mock("../src/stores/posts", async () => {
	const { writable } = await import("svelte/store");
	return {
		posts: writable([]),
	};
});

// Mock the post loader
vi.mock("../src/lib/postLoader", () => ({
	loadAllPosts: vi.fn().mockResolvedValue([]),
	loadPostBySlug: vi.fn().mockResolvedValue(null),
}));

// Mock mermaid to avoid errors in PostDetail
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		run: vi.fn(),
		render: vi.fn().mockResolvedValue({ svg: "" }),
	},
}));

// Mock ResizeObserver
class MockResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver as any;

// Import App after mocks
import App from "../src/App.svelte";

describe("App.svelte", () => {
	beforeEach(() => {
		document.body.className = "";
		vi.mocked(posts).set([]);
		vi.clearAllMocks();

		// Mock getBoundingClientRect on prototype
		window.HTMLElement.prototype.getBoundingClientRect = vi.fn(function (
			this: HTMLElement,
		) {
			const id =
				this.id || this.getAttribute("id") || this.getAttribute("data-testid");
			if (id === "sidebar") {
				return {
					width: 240,
					height: 1000,
					top: 0,
					left: 0,
					right: 240,
					bottom: 1000,
				} as DOMRect;
			}
			if (id === "content") {
				return {
					width: 800,
					height: 1000,
					top: 0,
					left: 260,
					right: 1060,
					bottom: 1000,
				} as DOMRect;
			}
			return {
				width: 1024,
				height: 768,
				top: 0,
				left: 0,
				right: 1024,
				bottom: 768,
			} as DOMRect;
		});
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	test("App 구조가 올바르게 렌더링되어야 함", async () => {
		vi.stubGlobal("innerWidth", 1200);
		render(App);
		await tick();

		expect(screen.getByTestId("sidebar")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
		expect(screen.getByRole("contentinfo")).toBeInTheDocument();
	});

	test("모바일 뷰(768px 미만)에서 사이드바가 기본적으로 접혀있는지 확인", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 500,
		});
		window.dispatchEvent(new Event("resize"));

		const { container } = render(App);

		await waitFor(
			() => {
				const appContainer = container.querySelector("#app-container");
				expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(
					true,
				);
			},
			{ timeout: 2000 },
		);
	});

	test("수동 토글 버튼 작동 확인", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1200,
		});
		window.dispatchEvent(new Event("resize"));

		const getBoundingClientRectSpy = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const id =
					this.id ||
					this.getAttribute("id") ||
					this.getAttribute("data-testid");
				if (id === "sidebar")
					return {
						width: 240,
						right: 240,
						left: 0,
						top: 0,
						bottom: 800,
					} as DOMRect;
				if (id === "content")
					return {
						width: 800,
						left: 400,
						right: 1200,
						top: 0,
						bottom: 800,
					} as DOMRect; // No overlap (240 < 400)
				return {
					width: 1200,
					left: 0,
					right: 1200,
					top: 0,
					bottom: 800,
				} as DOMRect;
			});

		const { container } = render(App);
		await tick();

		const toggleButton = screen.getByLabelText("Toggle Sidebar");
		const appContainer = container.querySelector("#app-container");

		// Initial state
		expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(false);

		await fireEvent.click(toggleButton);
		await tick();
		expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(true);

		await fireEvent.click(toggleButton);
		await tick();
		expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(false);

		getBoundingClientRectSpy.mockRestore();
	});

	test("toggle-sidebar 커스텀 이벤트 작동 확인", async () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1200,
		});
		window.dispatchEvent(new Event("resize"));

		const getBoundingClientRectSpy = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const id =
					this.id ||
					this.getAttribute("id") ||
					this.getAttribute("data-testid");
				if (id === "sidebar")
					return {
						width: 240,
						right: 240,
						left: 0,
						top: 0,
						bottom: 800,
					} as DOMRect;
				if (id === "content")
					return {
						width: 800,
						left: 400,
						right: 1200,
						top: 0,
						bottom: 800,
					} as DOMRect; // No overlap (240 < 400)
				return {
					width: 1200,
					left: 0,
					right: 1200,
					top: 0,
					bottom: 800,
				} as DOMRect;
			});

		const { container } = render(App);
		await tick();

		const appContainer = container.querySelector("#app-container");
		expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(false);

		// Dispatch custom event on document
		document.dispatchEvent(new CustomEvent("toggle-sidebar"));
		await tick();

		expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(true);

		getBoundingClientRectSpy.mockRestore();
	});

	test("PBT: 모바일 폭에서는 사이드바가 기본적으로 접혀있어야 함", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 0, max: 767 }), async (width) => {
				cleanup();
				vi.mocked(postLoader.loadAllPosts).mockResolvedValue([]);
				vi.mocked(posts).set([]);
				Object.defineProperty(window, "innerWidth", {
					writable: true,
					configurable: true,
					value: width,
				});
				window.dispatchEvent(new Event("resize"));

				render(App);

				await waitFor(() => {
					const appContainers = document.querySelectorAll("#app-container");
					const appContainer = appContainers[appContainers.length - 1] as
						| HTMLElement
						| undefined;
					expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(
						true,
					);
				});
			}),
			{ numRuns: 25 },
		);
	});

	test("PBT: 데스크톱 폭에서는 초기 상태가 접힘이 아니어야 함", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 768, max: 5000 }), async (width) => {
				cleanup();
				vi.mocked(postLoader.loadAllPosts).mockResolvedValue([]);
				vi.mocked(posts).set([]);
				Object.defineProperty(window, "innerWidth", {
					writable: true,
					configurable: true,
					value: width,
				});
				window.dispatchEvent(new Event("resize"));

				render(App);
				await tick();

				const appContainers = document.querySelectorAll("#app-container");
				const appContainer = appContainers[appContainers.length - 1] as
					| HTMLElement
					| undefined;
				expect(appContainer?.classList.contains("sidebar-collapsed")).toBe(
					false,
				);
			}),
			{ numRuns: 25 },
		);
	});

	test("포스트 로딩 에러 시 에러 메시지 표시 확인", async () => {
		const error = new Error("Failed to load posts");
		const errorPromise = Promise.reject(error);
		errorPromise.catch(() => {});

		vi.mocked(posts).set(errorPromise as any);

		render(App);
		await tick();

		await waitFor(
			() => {
				expect(
					screen.getByText(/Error loading posts:[\s\S]*Failed to load posts/i),
				).toBeInTheDocument();
			},
			{ timeout: 2000 },
		);
	});
});
