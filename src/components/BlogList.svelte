<script lang="ts">
import { push } from "svelte-spa-router";
import { defaultOgImage, getRuntimeOrigin } from "../lib/config";
import { detectLocale } from "../lib/locale";
import type { Post } from "../lib/postLoader";
import { formatDate, slugify } from "../lib/utils";
import { selectedCategory } from "../stores/category";
import { ensurePostsLoaded, posts as postsStore } from "../stores/posts";

export let params: { category?: string; tag?: string } = {};
const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

let filteredPosts: Post[] = [];
let resolvedLocale: "ko" | "en" = "en";
let seoTitle = "wintrover - Product Engineer & Builder";
let seoDescription =
	"wintrover's product engineering blog. Notes on AI/LLM, computer vision, and building products.";
let seoUrl = `${getRuntimeOrigin()}/`;
let requestedPosts = false;

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
	const allPosts: Post[] = Array.isArray($postsStore)
		? ($postsStore as Post[])
		: [];

	if (params.category) {
		const categoryPosts = allPosts.filter(
			(p) => slugify(p.category) === params.category,
		);
		if (params.tag) {
			filteredPosts = categoryPosts.filter((p) =>
				p.tags.some((tag) => slugify(tag) === params.tag),
			);
			selectedCategory.set(
				`${categoryPosts[0]?.category || "all"} - ${params.tag}`,
			);
		} else {
			filteredPosts = categoryPosts;
			selectedCategory.set(categoryPosts[0]?.category || "all");
		}
	} else {
		filteredPosts = allPosts;
		selectedCategory.set("all");
	}

	const isKo = resolvedLocale === "ko";
	const categoryLabel = params.category
		? filteredPosts?.[0]?.category || params.category
		: "";
	const tagLabel = params.tag ? `#${params.tag}` : "";

	seoTitle = params.category
		? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} - wintrover`
		: "wintrover - Product Engineer & Builder";
	seoDescription = params.category
		? isKo
			? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} 글 목록`
			: `Posts in ${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""}.`
		: isKo
			? "wintrover의 프로덕트 개발 블로그. AI/LLM, 컴퓨터 비전, 제품 만들기 기록."
			: "wintrover's product engineering blog. Notes on AI/LLM, computer vision, and building products.";
	seoUrl = browser
		? window.location.href
		: `${getRuntimeOrigin()}/${resolvedLocale}/`;
}

void filteredPosts;
void selectPost;
void formatDate;
void slugify;
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
  {#if filteredPosts.length > 0}
    <div class="posts">
      {#each filteredPosts as post}
        <article class="post">
          <div class="post-meta">
            <span class="date">{formatDate(post.date)}</span>
            {#if post.tags?.length}
              <span class="tag-badge {slugify(post.tags[0])}">
                {post.tags[0]}
              </span>
            {/if}
          </div>
          <h1>
            <button class="post-link" on:click={() => selectPost(post)}>
              {post.title}
            </button>
          </h1>
          {#if post.excerpt}
            <div class="post-excerpt">
              {post.excerpt}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <div class="no-posts">
      <p>No posts found in this category.</p>
    </div>
  {/if}
</div>

<style>
  .blog-page {
    min-height: 400px;
  }

  .posts {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .post {
    border-bottom: 1px solid #eee;
  }

  .post:last-child {
    border-bottom: none;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .date {
    color: #666;
    font-size: 14px;
  }

  .tag-badge {
    background: #0366d6;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .tag-badge.project {
    background: #28a745;
  }

  .tag-badge.smbholdings {
    background: #6f42c1;
  }

  .post h1 {
    margin: 0 0 15px 0;
    font-size: 24px;
    line-height: 1.3;
  }

  .post-link {
    background: none;
    border: none;
    color: #333;
    cursor: pointer;
    font-size: inherit;
    font-weight: inherit;
    text-align: left;
    padding: 0;
    transition: color 0.2s;
    width: 100%;
  }

  .post-link:hover {
    color: #0366d6;
  }

  .post-excerpt {
    color: #666;
    line-height: 1.6;
    font-size: 16px;
  }

  .no-posts {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }

  @media (max-width: 640px) {
    .post h1 {
      font-size: 20px;
    }

    .post-excerpt {
      font-size: 14px;
    }
  }
</style>
