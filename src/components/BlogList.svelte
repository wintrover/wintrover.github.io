<script lang="ts">
import { push } from "svelte-spa-router";
import {
	blogDefaultSeo,
	buildBlogListSeoUrl,
	getRuntimeOrigin,
} from "../lib/config";
import { detectLocaleFromRuntime } from "../lib/locale";
import type { Post } from "../lib/postLoader";
import { filterPostsByRoute, toPostArray } from "../lib/postQuery";
import { applyBlogListSeo } from "../lib/seo";
import { selectedCategory } from "../stores/category";
import { posts as postsStore } from "../stores/posts";
import PostFeed from "./PostFeed.svelte";

export let params: { category?: string; tag?: string } = {};
const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

let filteredPosts: Post[] = [];
let resolvedLocale: "ko" | "en" = "en";
let seoTitle = blogDefaultSeo.title;
let seoDescription = blogDefaultSeo.description.en;
let seoUrl = `${getRuntimeOrigin()}/`;
let routeMotionKey = "all";

function selectPost(post: Post) {
	push(`/post/${post.slug}`);
}

$: resolvedLocale = detectLocaleFromRuntime(
	browser ? window.location.pathname : "/",
);

$: {
	const allPosts = toPostArray($postsStore);
	const filterResult = filterPostsByRoute(allPosts, params);
	filteredPosts = filterResult.filteredPosts;
	selectedCategory.set(filterResult.selectedCategoryValue);
	routeMotionKey = `${params.category ?? "all"}::${params.tag ?? "all"}`;

	const isKo = resolvedLocale === "ko";
	const categoryLabel = filterResult.categoryLabel;
	const tagLabel = filterResult.tagLabel ? `#${filterResult.tagLabel}` : "";

	seoTitle = params.category
		? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""}`
		: blogDefaultSeo.title;
	seoDescription = params.category
		? isKo
			? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} 글 목록`
			: `Posts in ${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""}.`
		: blogDefaultSeo.description[isKo ? "ko" : "en"];
	seoUrl = buildBlogListSeoUrl({
		isBrowser: browser,
		currentHref: browser ? window.location.href : null,
		resolvedLocale,
	});
	if (browser) {
		applyBlogListSeo({
			title: seoTitle,
			description: seoDescription,
			canonical: seoUrl,
			resolvedLocale,
		});
	}
}

void filteredPosts;
void selectPost;
</script>

<div class="blog-page">
	{#key routeMotionKey}
		<PostFeed
			posts={filteredPosts}
			emptyMessage="No posts found in this category."
			onSelectPost={selectPost}
		/>
	{/key}
</div>

<style>
	.blog-page {
		min-height: 400px;
	}
</style>
