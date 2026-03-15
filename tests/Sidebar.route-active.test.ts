import { render } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Post } from "../src/lib/postLoader";
import { selectedCategory } from "../src/stores/category";

const { routeLocation } = vi.hoisted(() => ({
	routeLocation: (() => {
		let value = "/";
		const subscribers = new Set<(next: string) => void>();
		return {
			subscribe(run: (next: string) => void) {
				run(value);
				subscribers.add(run);
				return () => subscribers.delete(run);
			},
			set(next: string) {
				value = next;
				subscribers.forEach((run) => {
					run(value);
				});
			},
		};
	})(),
}));

vi.mock("../src/stores/posts", () => ({
	posts: writable<Post[]>([
		{
			fileName: "post-1",
			title: "Post 1",
			category: "Company Work",
			tags: ["SMBholdings"],
			slug: "post-1",
			date: "2024-01-01",
			excerpt: "",
			html: "",
			content: "",
		},
	]),
	ensurePostsLoaded: vi.fn().mockResolvedValue([]),
}));

vi.mock("svelte-spa-router", () => ({
	push: vi.fn(),
	location: routeLocation,
}));

import Sidebar from "../src/components/Sidebar.svelte";

describe("Sidebar route-driven active state", () => {
	beforeEach(() => {
		selectedCategory.set("all");
		routeLocation.set("/");
	});

	test("비목록 라우트에서는 카테고리 active 표시가 없어야 함", () => {
		selectedCategory.set("Company Work");
		routeLocation.set("/resume");
		render(Sidebar);

		expect(document.querySelector(".category-link.active")).toBeNull();
	});
});
