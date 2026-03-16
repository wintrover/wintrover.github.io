import { writable } from "svelte/store";
import { logError } from "../lib/log";
import type { Post } from "../lib/postLoader";
import { loadAllPosts } from "../lib/postLoader";

export const posts = writable<Post[]>([], (_set) => {
	const shouldAutoload =
		typeof window !== "undefined" && !import.meta.env.VITEST;
	if (shouldAutoload) {
		void ensurePostsLoaded();
	}
	return () => {};
});

let loadPromise: Promise<Post[]> | null = null;

export async function ensurePostsLoaded(options?: { forceCache?: boolean }) {
	const shouldCache = options?.forceCache ?? !import.meta.env.VITEST;
	if (!shouldCache) loadPromise = null;
	if (loadPromise) return loadPromise;

	loadPromise = loadAllPosts()
		.then((data) => {
			posts.set(data);
			return data;
		})
		.catch((error) => {
			logError("postsStore", "포스트 로딩 실패", { error });
			posts.set([]);
			if (shouldCache) {
				loadPromise = null;
			}
			return [];
		});

	return loadPromise;
}
