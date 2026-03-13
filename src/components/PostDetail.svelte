<script lang="ts">
import { onMount, tick } from "svelte";
import { push } from "svelte-spa-router";
import { buildPostDetailSeo, defaultOgImage } from "../lib/config";
import { detectLocale } from "../lib/locale";
import { logError } from "../lib/log";
import { loadPostBySlug, type Post } from "../lib/postLoader";
import { formatDate, slugify } from "../lib/utils";
import { posts as postsStore } from "../stores/posts";
import Comments from "./Comments.svelte";

const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

export let params: { slug?: string } = {};
let post: Post | null = null;
let loading = true;

let currentSlug: string | null = null;
let resolvedLocale: "ko" | "en" = "en";
let seoTitle = "wintrover";
let seoDescription = "";
let canonicalUrl = "";
let structuredData = "";

async function loadPostData(slug: string) {
	if (!slug) return;
	if (currentSlug === slug) return;

	currentSlug = slug;
	loading = true;

	try {
		const cached =
			Array.isArray($postsStore) && $postsStore.length > 0
				? ($postsStore as Post[]).find((p) => p.slug === slug)
				: undefined;
		if (cached) {
			post = cached;
			loading = false;
			return;
		}

		const postData = await loadPostBySlug(slug);

		if (!postData) {
			throw new Error(`포스트를 찾을 수 없습니다. (slug: ${slug})`);
		}

		post = postData;
		loading = false;
	} catch (error) {
		logError("PostDetail", "포스트 데이터 로딩 중 에러 발생", {
			slug,
			paramsState: {
				params,
				type: typeof params,
				isNull: params === null,
				isUndefined: params === undefined,
				keys: params ? Object.keys(params) : [],
			},
			location: browser
				? {
						href: window.location.href,
						pathname: window.location.pathname,
						hash: window.location.hash,
						search: window.location.search,
					}
				: "SSR",
			error,
		});
		loading = false;
	}
}

$: resolvedLocale = detectLocale({
	envLocale: import.meta.env.VITE_LOCALE,
	pathname: browser ? window.location.pathname : "/",
	navigatorLanguage: browser ? navigator.language : undefined,
});

$: {
	const slug = params?.slug ?? "";
	const seo = buildPostDetailSeo({ post, loading, slug, resolvedLocale });
	seoTitle = seo.seoTitle;
	seoDescription = seo.seoDescription;
	canonicalUrl = seo.canonicalUrl;
	structuredData = seo.structuredData;
}

onMount(() => {
	if (params?.slug) {
		loadPostData(params.slug);
	}
});

$: if (params) {
	// params 변경 감지 (디버깅용 로그 삭제됨)
}

$: if (params?.slug) {
	loadPostData(params.slug);
}

$: if (!loading && post) {
	updatePostEffects();
}

async function updatePostEffects() {
	if (!browser) return;
	await tick();
	setupCodeBlockButtons();
}

function showCopyToast(codeBlock: Element) {
	const existingToast = codeBlock.querySelector(".copy-toast");
	if (existingToast) {
		existingToast.remove();
	}

	const toast = document.createElement("div");
	toast.className = "copy-toast";
	toast.textContent = "code has been copied";

	codeBlock.appendChild(toast);

	setTimeout(() => {
		toast.classList.add("show");
	}, 10);

	setTimeout(() => {
		toast.classList.remove("show");
		setTimeout(() => {
			if (toast.parentNode) {
				toast.remove();
			}
		}, 300);
	}, 3000);
}

function setupCodeBlockButtons() {
	const codeBlocks = document.querySelectorAll(".markdown-content pre");

	codeBlocks.forEach((pre) => {
		const themeToggle = pre.querySelector(".devsite-icon-theme-toggle");
		const copyButton = pre.querySelector(".devsite-icon-copy");

		if (themeToggle && !themeToggle.hasAttribute("data-listener-added")) {
			themeToggle.setAttribute("data-listener-added", "true");
			themeToggle.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				pre.classList.toggle("dark-theme");
				themeToggle.classList.toggle("light-mode");
			});
		}

		if (copyButton && !copyButton.hasAttribute("data-listener-added")) {
			copyButton.setAttribute("data-listener-added", "true");
			copyButton.addEventListener("click", () => {
				const code = pre.querySelector("code");
				if (code) {
					const text = code.textContent || code.innerText;
					navigator.clipboard
						.writeText(text)
						.then(() => {
							showCopyToast(pre);
						})
						.catch((err) => {
							logError("PostDetail", "클립보드 복사 실패", { error: err });
						});
				}
			});
		}
	});
}

function goBack() {
	push("/");
}

void formatDate;
void slugify;
void Comments;
void goBack;
</script>

<svelte:head>
	<title>{seoTitle}</title>
	{#if seoDescription}
		<meta name="description" content={seoDescription} />
	{/if}
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta property="og:type" content={post ? "article" : "website"} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={defaultOgImage} />
	<meta property="og:image:alt" content={post?.title ?? seoTitle} />
	<meta property="og:site_name" content="wintrover" />
	<link rel="canonical" href={canonicalUrl} />
	{#if structuredData}
		<script type="application/ld+json">{structuredData}</script>
	{/if}
</svelte:head>

{#if post}
  <article class="post-detail">
    <header class="post-header">
      <div class="post-meta">
        <span class="date">{formatDate(post.date)}</span>
        <span class="category-badge {slugify(post.category)}">
          {post.category}
        </span>
      </div>
      <h1 class="post-title">{post.title}</h1>
      <div class="post-tags">
        {#each post.tags as tag}
          <span class="tag">#{tag}</span>
        {/each}
      </div>
    </header>

    <div class="post-content">
      {#if loading}
        <div class="loading">
          <p>Loading post content...</p>
        </div>
      {:else}
        <div class="markdown-content">
          {@html post.html}
        </div>
      {/if}
    </div>

    <footer class="post-footer">
      <button class="back-button" on:click={goBack}>
        ← Back to List
      </button>

      <div class="comments-section">
        <Comments />
      </div>
    </footer>
  </article>
{:else if !loading}
  <div class="error-container">
    <h2>Post not found</h2>
    <p>The post you're looking for doesn't exist or has been moved.</p>
    <button class="back-button" on:click={goBack}>
      Go back to home
    </button>
  </div>
{:else}
  <div class="loading-container">
    <p>Loading post...</p>
  </div>
{/if}

<style>
  .post-detail {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .post-header {
    margin-bottom: 40px;
    border-bottom: 1px solid #eee;
    padding-bottom: 20px;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
    font-size: 14px;
    color: #666;
  }

  .category-badge {
    background: #0366d6;
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-weight: 500;
  }

  .category-badge.project {
    background: #28a745;
  }

  .category-badge.company-work {
    background: #6f42c1;
  }

  .post-title {
    font-size: 36px;
    margin: 0 0 15px 0;
    line-height: 1.2;
    color: #24292e;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    font-size: 13px;
    color: #0366d6;
    background: #f1f8ff;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .post-content {
    line-height: 1.6;
    font-size: 17px;
    color: #24292e;
  }

  .loading, .content-error {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .post-footer {
    margin-top: 60px;
    padding-top: 30px;
    border-top: 1px solid #eee;
  }

  .back-button {
    background: none;
    border: 1px solid #0366d6;
    color: #0366d6;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 15px;
    transition: all 0.2s;
    margin-bottom: 40px;
  }

  .back-button:hover {
    background: #0366d6;
    color: white;
  }

  .comments-section {
    margin-top: 40px;
  }

  .error-container, .loading-container {
    text-align: center;
    padding: 100px 20px;
  }

  :global(.markdown-content) {
    word-break: break-word;
  }

  :global(.markdown-content h2) {
    margin-top: 40px;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 10px;
  }

  :global(.markdown-content pre) {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    position: relative;
    margin: 20px 0;
  }

  :global(.markdown-content code) {
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
    background-color: rgba(27, 31, 35, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }

  :global(.markdown-content pre code) {
    background-color: transparent;
    padding: 0;
  }

  :global(.markdown-content img) {
    max-width: 100%;
    height: auto;
  }

  :global(.markdown-content blockquote) {
    margin: 0;
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
  }

  :global(.markdown-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }

  :global(.markdown-content th, .markdown-content td) {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
  }

  :global(.markdown-content tr:nth-child(2n)) {
    background-color: #f6f8fa;
  }

  /* Copy Button and Toast Styles */
  :global(.devsite-icon-copy), :global(.devsite-icon-theme-toggle) {
    position: absolute;
    top: 8px;
    right: 8px;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    z-index: 10;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    line-height: 1;
  }

  :global(.devsite-icon-theme-toggle) {
    right: 45px;
  }

  :global(.devsite-icon-copy:hover), :global(.devsite-icon-theme-toggle:hover) {
    opacity: 1;
  }

  :global(.copy-toast) {
    position: absolute;
    top: 40px;
    right: 8px;
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 100;
  }

  :global(.copy-toast.show) {
    opacity: 1;
  }

  /* Dark Theme for Code Blocks */
  :global(.markdown-content pre.dark-theme) {
    background-color: #1e1e1e;
    color: #d4d4d4;
  }

  :global(.markdown-content pre.dark-theme code) {
    color: #d4d4d4;
  }

  @media (max-width: 768px) {
    .post-title {
      font-size: 28px;
    }

    .post-detail {
      padding: 15px;
    }
  }
</style>
