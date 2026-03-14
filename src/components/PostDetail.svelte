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
    --rhythm-gap-xs: 0.45rem;
    --rhythm-gap-sm: 0.85rem;
    --rhythm-gap-md: 0.95rem;
    --rhythm-gap-lg: 1.2rem;
    --rhythm-type-meta: 0.72rem;
    --rhythm-type-body: 0.98rem;
    --rhythm-line-body: 1.7;
    max-width: 820px;
    margin: 0 auto;
    padding: 1.5rem 0.25rem 1rem;
  }

  .post-header {
    margin-bottom: 2.25rem;
    border-bottom: 1px solid rgb(39 39 42 / 70%);
    padding-bottom: 1.1rem;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: var(--rhythm-gap-sm);
    margin-bottom: var(--rhythm-gap-sm);
    font-size: var(--rhythm-type-meta);
    letter-spacing: 0.02em;
    color: #71717a;
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    height: 1.5rem;
    background: rgb(39 39 42 / 75%);
    color: #d4d4d8;
    border: 1px solid rgb(63 63 70 / 85%);
    padding: 0 0.6rem;
    border-radius: 999px;
    font-size: var(--rhythm-type-meta);
    font-weight: 500;
    text-transform: uppercase;
  }

  .post-title {
    font-size: clamp(1.75rem, 3.2vw, 2.1rem);
    margin: 0 0 0.72rem;
    line-height: 1.22;
    color: #fafafa;
    letter-spacing: -0.01em;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--rhythm-gap-xs);
  }

  .tag {
    font-size: 0.73rem;
    color: #a1a1aa;
    background: rgb(39 39 42 / 55%);
    border: 1px solid rgb(63 63 70 / 80%);
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
  }

  .post-content {
    line-height: var(--rhythm-line-body);
    font-size: var(--rhythm-type-body);
    color: #d4d4d8;
  }

  .loading, .content-error {
    text-align: center;
    padding: 2.5rem 1rem;
    color: #71717a;
  }

  .post-footer {
    margin-top: 3.25rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgb(39 39 42 / 70%);
  }

  .back-button {
    background: rgb(24 24 27 / 86%);
    border: 1px solid rgb(63 63 70 / 80%);
    color: #fafafa;
    padding: 0.52rem 0.95rem;
    border-radius: 0.62rem;
    cursor: pointer;
    font-size: 0.85rem;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
    margin-bottom: 2rem;
  }

  .back-button:hover {
    background: rgb(39 39 42 / 90%);
    border-color: rgb(82 82 91);
    color: #fff;
  }

  .comments-section {
    margin-top: 2rem;
  }

  .error-container, .loading-container {
    text-align: center;
    padding: 5rem 1rem;
    color: #a1a1aa;
  }

  :global(.markdown-content) {
    word-break: break-word;
    color: #d4d4d8;
  }

  :global(.markdown-content h1),
  :global(.markdown-content h2),
  :global(.markdown-content h3),
  :global(.markdown-content h4) {
    color: #fafafa;
    line-height: 1.28;
  }

  :global(.markdown-content h2) {
    margin-top: 2.2rem;
    border-bottom: 1px solid rgb(39 39 42 / 70%);
    padding-bottom: 0.52rem;
  }

  :global(.markdown-content pre) {
    background: rgb(24 24 27 / 82%);
    border: 1px solid rgb(63 63 70 / 70%);
    border-radius: 0.72rem;
    padding: 0.95rem;
    overflow: auto;
    position: relative;
    margin: 1.2rem 0;
  }

  :global(.markdown-content code) {
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
    background: rgb(39 39 42 / 55%);
    color: #e4e4e7;
    padding: 0.18em 0.42em;
    border-radius: 0.36rem;
  }

  :global(.markdown-content pre code) {
    background-color: transparent;
    padding: 0;
    color: #e4e4e7;
  }

  :global(.markdown-content img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.72rem;
    border: 1px solid rgb(63 63 70 / 65%);
  }

  :global(.markdown-content blockquote) {
    margin: 0;
    padding: 0.1rem 0 0.1rem 0.9rem;
    color: #a1a1aa;
    border-left: 0.2rem solid rgb(82 82 91);
  }

  :global(.markdown-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.25rem 0;
  }

  :global(.markdown-content th, .markdown-content td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgb(63 63 70 / 70%);
  }

  :global(.markdown-content tr:nth-child(2n)) {
    background: rgb(24 24 27 / 70%);
  }

  :global(.devsite-icon-copy), :global(.devsite-icon-theme-toggle) {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
    z-index: 10;
    background: rgb(39 39 42 / 86%);
    color: #d4d4d8;
    border: 1px solid rgb(82 82 91 / 85%);
    border-radius: 0.45rem;
    padding: 0.24rem;
    font-size: 0.73rem;
    line-height: 1;
  }

  :global(.devsite-icon-theme-toggle) {
    right: 2.5rem;
  }

  :global(.devsite-icon-copy:hover), :global(.devsite-icon-theme-toggle:hover) {
    opacity: 1;
  }

  :global(.copy-toast) {
    position: absolute;
    top: 2.2rem;
    right: 0.45rem;
    background: rgb(9 9 11 / 95%);
    color: #f4f4f5;
    border: 1px solid rgb(63 63 70 / 85%);
    padding: 0.25rem 0.5rem;
    border-radius: 0.45rem;
    font-size: 0.7rem;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 100;
  }

  :global(.copy-toast.show) {
    opacity: 1;
  }

  :global(.markdown-content pre.dark-theme) {
    background: rgb(9 9 11 / 96%);
    border-color: rgb(39 39 42 / 90%);
    color: #e4e4e7;
  }

  :global(.markdown-content pre.dark-theme code) {
    color: #e4e4e7;
  }

  @media (max-width: 768px) {
    .post-title {
      font-size: clamp(1.65rem, 8vw, 2.05rem);
    }

    .post-detail {
      padding: 1rem 0;
    }
  }
</style>
