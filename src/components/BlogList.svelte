<script lang="ts">
import { push } from "svelte-spa-router";
import {
	blogDefaultSeo,
	defaultOgImage,
	getRuntimeOrigin,
} from "../lib/config";
import { detectLocale } from "../lib/locale";
import type { Post } from "../lib/postLoader";
import { filterPostsByRoute, toPostArray } from "../lib/postQuery";
import { selectedCategory } from "../stores/category";
import { ensurePostsLoaded, posts as postsStore } from "../stores/posts";
import PostFeed from "./PostFeed.svelte";

export let params: { category?: string; tag?: string } = {};
const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

let filteredPosts: Post[] = [];
let resolvedLocale: "ko" | "en" = "en";
let seoTitle = blogDefaultSeo.title;
let seoDescription = blogDefaultSeo.description.en;
let seoUrl = `${getRuntimeOrigin()}/`;
let requestedPosts = false;
let routeMotionKey = "all";

function selectPost(post: Post) {
	push(`/post/${post.slug}`);
}

$: if (!requestedPosts) {
	requestedPosts = true;
	void ensurePostsLoaded();
}

$: resolvedLocale = detectLocale({
	envLocale: import.meta.env.VITE_LOCALE,
	pathname: browser ? window.location.pathname : "/",
	navigatorLanguage: browser ? navigator.language : undefined,
});

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
		? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} - wintrover`
		: blogDefaultSeo.title;
	seoDescription = params.category
		? isKo
			? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} 글 목록`
			: `Posts in ${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""}.`
		: blogDefaultSeo.description[isKo ? "ko" : "en"];
	seoUrl = browser
		? window.location.href
		: `${getRuntimeOrigin()}/${resolvedLocale}/`;
}

void filteredPosts;
void selectPost;
</script>

<svelte:head>
	<title>{seoTitle}</title>
	<meta name="description" content={seoDescription} />
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={seoUrl} />
	<meta property="og:image" content={defaultOgImage} />
	<meta property="og:image:alt" content={seoTitle} />
	<meta property="og:site_name" content="wintrover" />
	<link rel="canonical" href={seoUrl} />
</svelte:head>

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
