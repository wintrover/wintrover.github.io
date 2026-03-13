<script lang="ts">
import { fade, fly } from "svelte/transition";
import { push } from "svelte-spa-router";
import type { Post } from "../lib/postLoader";
import { slugify } from "../lib/utils";
import { ensurePostsLoaded, posts as postsStore } from "../stores/posts";

type BentoPost = {
	slug: string;
	title: string;
	excerpt: string;
	category: string;
	date: string;
	readingTime: string;
	size: "standard" | "wide" | "tall" | "feature";
};

const navItems = ["Posts", "Resume", "Projects", "About"];
const sizePattern: BentoPost["size"][] = [
	"feature",
	"tall",
	"wide",
	"standard",
	"standard",
	"wide",
];
let requestedPosts = false;
let bentoPosts: BentoPost[] = [];
let projectPosts: BentoPost[] = [];
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

function estimateReadingTime(content: string) {
	const words = content.trim().split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.round(words / 220));
	return `${minutes} min`;
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

function toBentoPost(post: Post, index: number): BentoPost {
	return {
		slug: post.slug,
		title: post.title,
		excerpt:
			post.excerpt?.trim() ||
			"Deep dives on product engineering, architecture, and reliable delivery.",
		category: post.category,
		date: formatDate(post.date),
		readingTime: estimateReadingTime(post.content || ""),
		size: sizePattern[index % sizePattern.length] || "standard",
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
	bentoPosts = allPosts.slice(0, 10).map(toBentoPost);
	projectPosts = allPosts
		.filter((post) => slugify(post.category) === "project")
		.slice(0, 3)
		.map(toBentoPost);
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
				<p class="eyebrow">Product Engineer Blog</p>
				<h1>Minimal, dense, and discoverable writing surface</h1>
				<p class="description">
					AI/LLM, computer vision, and product engineering notes arranged in a bento
					grid for fast scanning.
				</p>
			</section>
		</div>

		{#if bentoPosts.length > 0}
			<section id="posts" class="bento-grid">
				{#each bentoPosts as post, index}
					<div
						class={`bento-item ${post.size}`}
						transition:fade={{ duration: 320 + index * 16, delay: 30 + index * 45 }}
					>
						<article
							class="bento-card w-full"
							transition:fly={{ y: 18, duration: 360 + index * 18, delay: 40 + index * 55 }}
						>
							<div class="meta">
								<span class="category">{post.category}</span>
								<span>{post.date}</span>
								<span>{post.readingTime}</span>
							</div>
							<h2>{post.title}</h2>
							<p>{post.excerpt}</p>
							<button class="read-more" type="button" on:click={() => openPost(post.slug)}>
								Read article
							</button>
						</article>
					</div>
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
								<span>{post.readingTime}</span>
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
		max-width: 1120px;
		margin: 0 auto;
		padding: 2rem 1.3rem 4rem;
	}

	.hero {
		padding: 2.4rem 0 2rem;
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

	.bento-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		grid-auto-rows: minmax(7.5rem, auto);
		gap: 1rem;
		align-items: stretch;
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

	.bento-card {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.9rem;
		padding: 1.2rem;
		min-width: 0;
		min-height: 12.5rem;
		border-radius: 1.3rem;
		background: linear-gradient(160deg, rgb(24 24 27 / 88%), rgb(9 9 11 / 92%));
		border: 1px solid rgb(255 255 255 / 6%);
		transition:
			transform 0.35s ease,
			border-color 0.35s ease,
			box-shadow 0.35s ease;
	}

	.bento-card::before {
		content: "";
		position: absolute;
		inset: 0;
		opacity: 0;
		background: linear-gradient(
			120deg,
			rgb(255 255 255 / 18%) 0%,
			rgb(244 244 245 / 4%) 40%,
			rgb(244 244 245 / 16%) 100%
		);
		transition: opacity 0.35s ease;
		pointer-events: none;
	}

	.bento-card:hover {
		transform: translateY(-4px);
		border-color: rgb(255 255 255 / 14%);
		box-shadow:
			0 18px 40px rgb(0 0 0 / 30%),
			0 0 0 1px rgb(255 255 255 / 8%);
	}

	.bento-card:hover::before {
		opacity: 1;
	}

	.feature {
		grid-column: span 1;
		grid-row: span 1;
	}

	.tall {
		grid-column: span 1;
		grid-row: span 1;
	}

	.wide {
		grid-column: span 1;
		grid-row: span 1;
	}

	.standard {
		grid-column: span 1;
		grid-row: span 1;
	}

	.bento-item {
		width: 100%;
		min-width: 0;
	}

	.w-full {
		width: 100%;
	}

	.meta {
		display: flex;
		gap: 0.65rem;
		align-items: center;
		font-size: 0.75rem;
		color: #a1a1aa;
		flex-wrap: wrap;
	}

	.category {
		color: #fff;
		font-weight: 600;
		padding: 0.22rem 0.55rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 8%);
	}

	h2 {
		margin: 0;
		color: #fff;
		font-size: clamp(1.15rem, 2.1vw, 1.75rem);
		font-weight: 650;
		line-height: 1.25;
		word-break: break-word;
		overflow-wrap: break-word;
		min-width: 0;
	}

	.bento-card p {
		margin: 0;
		color: #a1a1aa;
		line-height: 1.65;
		font-size: 0.95rem;
		word-break: break-word;
		overflow-wrap: break-word;
		min-width: 0;
	}

	.meta span {
		word-break: break-word;
		overflow-wrap: break-word;
		min-width: 0;
	}

	.read-more {
		align-self: flex-start;
		border: 0;
		border-radius: 0.75rem;
		padding: 0.5rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: #fff;
		background: rgb(255 255 255 / 10%);
		transition: background-color 0.3s ease;
	}

	.read-more:hover {
		background: rgb(255 255 255 / 18%);
	}

	@media (min-width: 768px) {
		.bento-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1rem;
		}

		.feature {
			grid-column: span 2;
			grid-row: span 2;
		}

		.tall {
			grid-column: span 1;
			grid-row: span 2;
		}

		.wide {
			grid-column: span 2;
			grid-row: span 1;
		}

		.standard {
			grid-column: span 1;
			grid-row: span 1;
		}
	}

	@media (min-width: 1024px) {
		.bento-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1.25rem;
		}

		.feature,
		.wide {
			grid-column: span 2;
		}

		.feature,
		.tall {
			grid-row: span 3;
		}

		.wide,
		.standard {
			grid-row: span 2;
		}
	}

	@media (max-width: 720px) {
		.navbar {
			padding: 0.9rem 1rem;
		}

		.content {
			padding: 1.2rem 0.9rem 2.6rem;
		}

		.feature,
		.tall,
		.wide,
		.standard {
			grid-column: span 1;
			grid-row: span 1;
		}
	}
</style>
