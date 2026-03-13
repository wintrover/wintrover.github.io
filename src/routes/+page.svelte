<script lang="ts">
import { fade, fly } from "svelte/transition";
import { push } from "svelte-spa-router";
import type { Post } from "../lib/postLoader";
import { slugify } from "../lib/utils";
import { ensurePostsLoaded, posts as postsStore } from "../stores/posts";

type HomePost = {
	slug: string;
	title: string;
	excerpt: string;
	date: string;
	keywords: string[];
};

const navItems = ["Posts", "Resume", "Projects", "About"];
let requestedPosts = false;
let homePosts: HomePost[] = [];
let projectPosts: HomePost[] = [];
const browser =
	typeof window !== "undefined" && typeof document !== "undefined";

function navigateFromNav(item: string) {
	if (item === "Posts") {
		scrollToSection("posts");
		return;
	}
	if (item === "Resume") {
		void push("/resume");
		return;
	}
	if (item === "Projects") {
		scrollToSection("projects");
		return;
	}
	if (item === "About") {
		scrollToSection("about");
	}
}

function scrollToSection(sectionId: string) {
	if (!browser) return;
	const section = document.getElementById(sectionId);
	if (!section) return;
	section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatDate(date: string) {
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return date;
	return parsed.toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

function toHomePost(post: Post): HomePost {
	const normalizedTags = Array.isArray(post.tags)
		? post.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: [];
	const keywords =
		normalizedTags.length > 0 ? normalizedTags.slice(0, 3) : ["Note"];

	return {
		slug: post.slug,
		title: post.title,
		excerpt:
			post.excerpt?.trim() ||
			"Deep dives on product engineering, architecture, and reliable delivery.",
		date: formatDate(post.date),
		keywords,
	};
}

function openPost(slug: string) {
	void push(`/post/${slug}`);
}

$: if (!requestedPosts) {
	requestedPosts = true;
	void ensurePostsLoaded();
}

$: {
	const allPosts: Post[] = Array.isArray($postsStore) ? $postsStore : [];
	homePosts = allPosts.slice(0, 12).map(toHomePost);
	projectPosts = allPosts
		.filter((post) => slugify(post.category) === "project")
		.slice(0, 3)
		.map(toHomePost);
}
</script>

<div class="page">
	<header class="navbar" transition:fade={{ duration: 360 }}>
		<div class="brand">wintrover</div>
		<nav class="nav">
			{#each navItems as item}
				<button class="nav-item" type="button" on:click={() => navigateFromNav(item)}>
					{item}
				</button>
			{/each}
		</nav>
	</header>

	<main class="content">
		<div transition:fade={{ duration: 420 }}>
			<section class="hero" transition:fly={{ y: 16, duration: 420 }}>
				<p class="eyebrow">Engineering Journal</p>
				<h1>Shipping ideas with reliability</h1>
				<p class="description">
					Notes on building products, engineering discipline, and practical AI.
				</p>
			</section>
		</div>

		{#if homePosts.length > 0}
			<section id="posts" class="post-list">
				{#each homePosts as post, index}
					<article
						class="post-card w-full"
						transition:fly={{ y: 12, duration: 320 + index * 14, delay: 30 + index * 25 }}
					>
						<div class="meta">
							<div class="keyword-list">
								{#each post.keywords as keyword}
									<span class="keyword-badge">{keyword}</span>
								{/each}
							</div>
							<span>{post.date}</span>
						</div>
						<button
							class="title-link"
							type="button"
							aria-label={`Open ${post.title}`}
							on:click={() => openPost(post.slug)}
						>
							<h2>{post.title}</h2>
						</button>
						<p class="excerpt">{post.excerpt}</p>
					</article>
				{/each}
			</section>

			<section id="projects" class="section-block" transition:fade={{ duration: 420 }}>
				<div class="section-head">
					<p class="eyebrow">Projects</p>
					<h2 class="section-title">Featured project posts</h2>
				</div>
				<div class="project-list">
					{#if projectPosts.length > 0}
						{#each projectPosts as post, index}
							<button
								class="project-item"
								type="button"
								on:click={() => openPost(post.slug)}
								transition:fly={{ y: 16, duration: 330 + index * 20, delay: 40 + index * 45 }}
							>
								<span>{post.title}</span>
							</button>
						{/each}
					{:else}
						<p class="section-empty">No project posts yet.</p>
					{/if}
				</div>
			</section>

			<section id="about" class="section-block" transition:fade={{ duration: 420 }}>
				<div class="section-head">
					<p class="eyebrow">About</p>
					<h2 class="section-title">Building products with shipping discipline</h2>
				</div>
				<p class="about-copy">
					I design and ship practical AI-powered products with a strong focus on
					reliability, measurable outcomes, and fast iteration.
				</p>
			</section>
		{:else}
			<div class="empty" transition:fade={{ duration: 320 }}>
				No posts found.
			</div>
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #09090b;
		color: #a1a1aa;
		font-family:
			"Geist Sans",
			"Pretendard",
			"Inter",
			-apple-system,
			blinkmacsystemfont,
			"Segoe UI",
			sans-serif;
	}

	.page {
		min-height: 100vh;
		background: radial-gradient(circle at 20% 0%, rgb(39 39 42 / 24%), transparent 55%)
			#09090b;
	}

	.navbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: rgb(9 9 11 / 56%);
		border-bottom: 1px solid rgb(255 255 255 / 7%);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.brand {
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.nav {
		display: flex;
		gap: 0.4rem;
	}

	.nav-item {
		border: 0;
		background: transparent;
		color: #a1a1aa;
		padding: 0.45rem 0.8rem;
		border-radius: 0.8rem;
		font-size: 0.88rem;
		font-weight: 500;
		transition: background-color 0.25s ease;
	}

	.nav-item:hover {
		background: rgb(255 255 255 / 5%);
		color: #fff;
	}

	.content {
		max-width: 920px;
		margin: 0 auto;
		padding: 2.2rem 1.8rem 4rem;
	}

	.hero {
		padding: 0 0 2rem;
		display: grid;
		gap: 1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #d4d4d8;
	}

	h1 {
		margin: 0;
		color: #fff;
		font-size: clamp(1.9rem, 3.8vw, 3rem);
		font-weight: 700;
		line-height: 1.08;
		max-width: 18ch;
	}

	.description {
		margin: 0;
		font-size: 1rem;
		line-height: 1.7;
		max-width: 60ch;
		color: #a1a1aa;
	}

	.post-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
		max-width: 100%;
	}

	.post-card {
		width: 100%;
		min-width: 0;
		display: grid;
		gap: 0.95rem;
		padding: 1.2rem 0;
		border-bottom: 1px solid rgb(39 39 42 / 50%);
		background: transparent;
		transition:
			background-color 0.28s ease,
			border-color 0.28s ease;
	}

	.post-card:hover {
		background: rgb(255 255 255 / 2.5%);
		border-color: rgb(63 63 70);
	}

	.empty {
		padding: 3rem 1rem;
		color: #a1a1aa;
		font-size: 0.95rem;
	}

	.section-block {
		margin-top: 2.4rem;
		padding: 1.35rem;
		border-radius: 1.2rem;
		background: linear-gradient(160deg, rgb(24 24 27 / 70%), rgb(9 9 11 / 92%));
		border: 1px solid rgb(255 255 255 / 6%);
	}

	.section-head {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.section-title {
		margin: 0;
		color: #fff;
		font-size: clamp(1.25rem, 2.3vw, 1.6rem);
		font-weight: 650;
	}

	.project-list {
		display: grid;
		gap: 0.75rem;
	}

	.project-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		width: 100%;
		border: 1px solid rgb(255 255 255 / 8%);
		background: rgb(24 24 27 / 76%);
		color: #e4e4e7;
		padding: 0.85rem 1rem;
		border-radius: 0.9rem;
		font-size: 0.9rem;
		text-align: left;
		transition:
			transform 0.3s ease,
			border-color 0.3s ease;
	}

	.project-item:hover {
		transform: translateY(-2px);
		border-color: rgb(255 255 255 / 18%);
	}

	.project-item span {
		min-width: 0;
		word-break: break-word;
		overflow-wrap: break-word;
	}

	.project-item span:first-child {
		flex: 1;
	}

	.section-empty {
		margin: 0;
		color: #a1a1aa;
		font-size: 0.9rem;
	}

	.about-copy {
		margin: 0;
		font-size: 0.98rem;
		line-height: 1.8;
		color: #a1a1aa;
	}

	.w-full {
		width: 100%;
	}

	.meta {
		display: flex;
		gap: 0.85rem;
		align-items: center;
		font-size: 0.72rem;
		color: #a1a1aa;
		flex-wrap: wrap;
	}

	.meta span {
		color: #71717a;
	}

	.title-link {
		width: 100%;
		border: 0;
		background: transparent;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}

	h2 {
		margin: 0;
		color: #fff;
		font-size: clamp(1.38rem, 2.2vw, 1.9rem);
		font-weight: 700;
		line-height: 1.2;
		word-break: break-word;
		overflow-wrap: break-word;
		min-width: 0;
		transition: color 0.28s ease;
	}

	.post-card:hover h2,
	.title-link:hover h2 {
		color: #f4f4f5;
	}

	.excerpt {
		margin: 0;
		color: #a1a1aa;
		line-height: 1.7;
		font-size: 0.98rem;
		word-break: break-word;
		overflow-wrap: break-word;
		min-width: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.keyword-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		min-width: 0;
	}

	.keyword-badge {
		display: inline-flex;
		align-items: center;
		height: 1.4rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		color: #a1a1aa;
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		background: rgb(39 39 42 / 50%);
	}

	@media (max-width: 720px) {
		.navbar {
			padding: 0.9rem 1rem;
		}

		.content {
			padding: 1.2rem 0.9rem 2.6rem;
		}
	}
</style>
