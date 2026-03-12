<script lang="ts">
import { onMount } from "svelte";
import { push } from "svelte-spa-router";
import { logError } from "../lib/log";
import { loadAllPosts } from "../lib/postLoader";
import { formatDate, slugify } from "../lib/utils";
import { selectedCategory } from "../stores/category";

export let params: { category?: string; tag?: string } = {};
let posts = [];
let filteredPosts = [];
const siteOrigin = "https://wintrover.github.io";
const defaultOgImage = `${siteOrigin}/images/profile.png`;

function selectPost(post) {
	push(`/post/${post.slug}`);
}

function updateMetaTag(property, content) {
	let meta =
		document.querySelector(`meta[property="${property}"]`) ||
		document.querySelector(`meta[name="${property}"]`);

	if (!meta) {
		meta = document.createElement("meta");
		meta.setAttribute(property.includes("og:") ? "property" : "name", property);
		document.head.appendChild(meta);
	}

	meta.setAttribute("content", content);
}

function updateLinkTag(rel, href) {
	let link = document.querySelector(`link[rel="${rel}"]`);

	if (!link) {
		link = document.createElement("link");
		link.setAttribute("rel", rel);
		document.head.appendChild(link);
	}

	link.setAttribute("href", href);
}

function updateListingSeo({
	title,
	description,
	url,
}: {
	title: string;
	description: string;
	url: string;
}) {
	document.title = title;
	updateMetaTag("description", description);
	updateMetaTag("og:title", title);
	updateMetaTag("og:description", description);
	updateMetaTag("og:type", "website");
	updateMetaTag("og:url", url);
	updateMetaTag("og:image", defaultOgImage);
	updateMetaTag("og:image:alt", title);
	updateMetaTag("og:site_name", "wintrover");
	updateLinkTag("canonical", url);
}

async function loadPosts() {
	try {
		// 모든 포스트를 동적으로 로드
		posts = await loadAllPosts();

		// URL 파라미터에 따라 필터링
		if (params.category) {
			const categoryPosts = posts.filter(
				(post) => slugify(post.category) === params.category,
			);
			if (params.tag) {
				filteredPosts = categoryPosts.filter((post) =>
					post.tags.some((tag) => slugify(tag) === params.tag),
				);
				selectedCategory.set(
					`${categoryPosts[0]?.category || "all"} - ${params.tag}`,
				);
			} else {
				filteredPosts = categoryPosts;
				selectedCategory.set(categoryPosts[0]?.category || "all");
			}
		} else {
			filteredPosts = posts;
			selectedCategory.set("all");
		}

		if (typeof document !== "undefined") {
			const url = window.location.href;
			const lang = (document.documentElement.lang || "en").toLowerCase();
			const isKo = lang.startsWith("ko");
			const categoryLabel = params.category
				? filteredPosts?.[0]?.category || params.category
				: "";
			const tagLabel = params.tag ? `#${params.tag}` : "";
			const listTitle = params.category
				? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} - wintrover`
				: "wintrover - Fullstack AI Application Architect";
			const listDescription = params.category
				? isKo
					? `${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""} 글 목록`
					: `Posts in ${categoryLabel}${tagLabel ? ` ${tagLabel}` : ""}.`
				: isKo
					? "wintrover의 개발 블로그. AI/LLM, 컴퓨터 비전, 풀스택 개발 기록."
					: "wintrover's engineering blog. Notes on AI/LLM, computer vision, and fullstack development.";
			updateListingSeo({
				title: listTitle,
				description: listDescription,
				url,
			});
		}
	} catch (error) {
		logError("BlogList", "포스트 목록 로딩 중 에러 발생", { params, error });
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
