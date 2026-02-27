<script lang="ts">
import { onMount } from "svelte";
import { push } from "svelte-spa-router";
import { loadAllPosts } from "../lib/postLoader";
import { formatDate, slugify } from "../lib/utils";
import { selectedCategory } from "../stores/category";

export let params: { category?: string } = {};
let posts = [];
let filteredPosts = [];

function selectPost(post) {
	push(`/post/${post.slug}`);
}

async function loadPosts() {
	try {
		// 모든 포스트를 동적으로 로드
		posts = await loadAllPosts();

		// URL 파라미터에 따라 필터링
		if (params.category) {
			filteredPosts = posts.filter(
				(post) => slugify(post.category) === params.category,
			);
			selectedCategory.set(
				posts.find((p) => slugify(p.category) === params.category)?.category ||
					"all",
			);
		} else {
			filteredPosts = posts;
			selectedCategory.set("all");
		}
	} catch (error) {
		console.error("❌ [BlogList] 포스트 목록 로딩 중 에러 발생:", {
			params,
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : "Stack trace unavailable",
			error,
		});
		filteredPosts = [];
	}
}

onMount(() => {
	loadPosts();
});

$: if (params) {
	loadPosts();
}

void filteredPosts;
void selectPost;
void formatDate;
void slugify;
</script>

<div class="blog-page">
  {#if filteredPosts.length > 0}
    <div class="posts">
      {#each filteredPosts as post}
        <article class="post">
          <div class="post-meta">
            <span class="date">{formatDate(post.date)}</span>
            {#if post.category}
              <span class="category-badge {slugify(post.category)}">
                {post.category}
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

  .category-badge {
    background: #0366d6;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .category-badge.project {
    background: #28a745;
  }

  .category-badge.company-work {
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
