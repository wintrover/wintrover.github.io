<script lang="ts">
import { fade } from "svelte/transition";
import { push } from "svelte-spa-router";
import PostFeed from "../components/PostFeed.svelte";
import type { Post } from "../lib/postLoader";
import { posts as postsStore } from "../stores/posts";

let homePosts: Post[] = [];

function openPost(slug: string) {
	void push(`/post/${slug}`);
}

$: {
	const allPosts: Post[] = Array.isArray($postsStore) ? $postsStore : [];
	homePosts = allPosts.slice(0, 12);
}
</script>

<div class="page">
	<main class="content">
		<div>
			<section class="hero motion-reveal">
				<p class="eyebrow">Engineering Journal</p>
				<h1>Shipping ideas with reliability</h1>
				<p class="description">
					Notes on building products, engineering discipline, and practical AI.
				</p>
			</section>
		</div>

		{#if homePosts.length > 0}
			<section id="posts">
				<PostFeed
					posts={homePosts}
					emptyMessage="No posts found."
					onSelectPost={(post) => openPost(post.slug)}
				/>
			</section>
		{:else}
			<div class="section-empty" transition:fade={{ duration: 320 }}>
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

	.content {
		max-width: 920px;
		margin: 0 auto;
		padding: 2.2rem 1.8rem 4rem;
	}

	.hero {
		padding: 2rem 0;
		display: grid;
		gap: 1rem;
		position: relative;
		overflow: clip;
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

	.section-block {
		margin-top: 2.4rem;
		padding: 1.35rem;
		border-radius: 1.2rem;
		background: linear-gradient(160deg, rgb(24 24 27 / 70%), rgb(9 9 11 / 92%));
		border: 1px solid rgb(255 255 255 / 6%);
		will-change: transform, opacity;
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
			border-color 0.3s ease,
			box-shadow 0.3s ease;
	}

	.project-item:hover {
		transform: translateY(-2px);
		border-color: rgb(255 255 255 / 18%);
		box-shadow: 0 10px 26px rgb(0 0 0 / 28%);
	}

	.motion-reveal {
		animation: sectionReveal 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.hero.motion-reveal {
		animation: heroReveal 0.74s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	#projects.motion-reveal {
		animation-delay: 0.08s;
	}

	#about.motion-reveal {
		animation-delay: 0.16s;
	}

	@keyframes sectionReveal {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes heroReveal {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.99);
			filter: blur(1px);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
			filter: blur(0);
		}
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

	@media (max-width: 720px) {
		.content {
			padding: 1.2rem 0.9rem 2.6rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.motion-reveal {
			animation-duration: 0.01ms;
			animation-iteration-count: 1;
		}
	}
</style>
