<script lang="ts">
import { fly } from "svelte/transition";
import type { Post } from "../lib/postLoader";
import { formatDate } from "../lib/utils";

export let posts: Post[] = [];
export let emptyMessage = "No posts found.";
export let onSelectPost: (post: Post) => void = () => {};

function getKeywords(post: Post) {
	const normalizedTags = Array.isArray(post.tags)
		? post.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: [];

	return normalizedTags.length > 0 ? normalizedTags.slice(0, 3) : ["Note"];
}

void getKeywords;
</script>

{#if posts.length > 0}
	<section class="post-list">
		{#each posts as post, index}
			<article
				class="post-card w-full"
				in:fly={{ y: 12, duration: 320 + index * 14, delay: 30 + index * 25 }}
			>
				<div class="meta">
					<div class="keyword-list">
						{#each getKeywords(post) as keyword}
							<span class="keyword-badge">{keyword}</span>
						{/each}
					</div>
					<span>{formatDate(post.date)}</span>
				</div>
				<button
					class="title-link"
					type="button"
					aria-label={`Open ${post.title}`}
					on:click={() => onSelectPost(post)}
				>
					<h2>{post.title}</h2>
				</button>
				{#if post.excerpt}
					<p class="excerpt">{post.excerpt}</p>
				{/if}
			</article>
		{/each}
	</section>
{:else}
	<div class="empty">{emptyMessage}</div>
{/if}

<style>
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
		min-height: 176px;
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
		line-height: 1.22;
		transition: color 0.24s ease;
		word-break: break-word;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-width: 0;
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
</style>
