import { writable } from "svelte/store";
import { loadAllPosts } from "../lib/postLoader";

export const posts = writable<any[]>([], (set) => {
	loadAllPosts()
		.then((data) => {
			set(data);
		})
		.catch((error) => {
			console.error("[postsStore] Failed to load posts:", error);
			set([]); // 에러 발생 시 빈 배열로 설정하여 중단 방지
		});
});
