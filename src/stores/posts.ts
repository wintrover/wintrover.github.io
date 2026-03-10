import { writable } from "svelte/store";
import { logError } from "../lib/log";
import type { Post } from "../lib/postLoader";
import { loadAllPosts } from "../lib/postLoader";

export const posts = writable<Post[]>([], (set) => {
	loadAllPosts()
		.then((data) => {
			set(data);
		})
		.catch((error) => {
			logError("postsStore", "포스트 로딩 실패", { error });
			set([]); // 에러 발생 시 빈 배열로 설정하여 중단 방지
		});
});
