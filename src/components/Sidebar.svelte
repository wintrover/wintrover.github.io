<script lang="ts">
import type { Readable } from "svelte/store";
import * as spaRouter from "svelte-spa-router";
import categoryConfig from "../lib/categories.json";
import { siteConfig } from "../lib/config";
import {
	buildSidebarData,
	type CategoryGroup,
	type SidebarItem,
	toPostArray,
} from "../lib/postQuery";
import { selectedCategory } from "../stores/category";
import { posts } from "../stores/posts";

let allPostsItem: SidebarItem = {
	label: "All Posts",
	slug: "all",
	count: 0,
	value: "all",
};
let categoryGroups: CategoryGroup[] = [];
let resumeUrl = "/resume/";
let currentActivePath = "/";
const push = spaRouter.push;
const routeLocation: Readable<string> =
	"location" in spaRouter && spaRouter.location
		? (spaRouter.location as Readable<string>)
		: {
				subscribe(run: (path: string) => void) {
					run("/");
					return () => {};
				},
			};

void siteConfig;
void posts;

$: resumeUrl = "/resume/";
$: currentActivePath = normalizeRoutePath($routeLocation);

$: {
	const sidebarData = buildSidebarData(toPostArray($posts), categoryConfig);
	allPostsItem = sidebarData.allPostsItem;
	categoryGroups = sidebarData.categoryGroups;
}

function closeSidebarOnMobile() {
	if (window.innerWidth < 768) {
		document.dispatchEvent(new CustomEvent("toggle-sidebar"));
	}
}

function selectCategory(item: SidebarItem) {
	let nextPath = "/";
	if (item.value === "all") {
		selectedCategory.set("all");
		nextPath = "/";
	} else if (item.isTag) {
		selectedCategory.set(item.value);
		nextPath = `/category/${item.parentSlug}/tag/${item.slug}`;
	} else {
		selectedCategory.set(item.value);
		nextPath = `/category/${item.slug}`;
	}
	currentActivePath = normalizeRoutePath(nextPath);
	push(nextPath);
	closeSidebarOnMobile();
}

function goResume(event: MouseEvent) {
	event.preventDefault();
	currentActivePath = normalizeRoutePath(resumeUrl);
	push(resumeUrl);
	closeSidebarOnMobile();
}

void selectCategory;
void goResume;

function normalizeRoutePath(path: string) {
	const pathWithoutQuery = path.split("?")[0] ?? "/";
	const trimmedPath = pathWithoutQuery.replace(/\/+$/, "");
	return trimmedPath || "/";
}

function isActive(item: SidebarItem, currentPath: string) {
	if (currentPath === "/") {
		return item.value === "all";
	}
	if (!currentPath.startsWith("/category/")) {
		return false;
	}
	const pathParts = currentPath.split("/").filter(Boolean);
	const categorySlug = pathParts[1] ?? "";
	const isTagRoute = pathParts[2] === "tag";
	const tagSlug = pathParts[3] ?? "";
	if (item.isTag) {
		return (
			isTagRoute && item.parentSlug === categorySlug && item.slug === tagSlug
		);
	}
	return !isTagRoute && item.slug === categorySlug;
}

void allPostsItem;
void categoryGroups;
void isActive;
</script>

<div class="sidebar-header">
  <div class="profile-section motion-reveal">
    <div class="avatar-link">
      <img src={siteConfig.avatar} alt={siteConfig.name} class="avatar" />
    </div>
    <h1 class="site-name">
      {siteConfig.name}
    </h1>
    <p class="site-description">{siteConfig.description}</p>
  </div>
</div>

<div class="sidebar-module motion-reveal">
  <h4>Explore</h4>
  <ul class="category-list motion-stagger-list">
    <li>
      <button
        class="category-link all-posts-link {isActive(allPostsItem, currentActivePath) ? 'active' : ''}"
        on:click={() => selectCategory(allPostsItem)}
      >
        {allPostsItem.label} ({allPostsItem.count})
      </button>
      <ul class="category-tree">
        {#each categoryGroups as group}
          <li class="category-node">
            <button
              class="category-link category-level {isActive(group.category, currentActivePath) ? 'active' : ''}"
              on:click={() => selectCategory(group.category)}
            >
              {group.category.label} ({group.category.count})
            </button>
            {#if group.tags.length > 0}
              <ul class="subtopic-tree">
                {#each group.tags as tag}
                  <li class="subtopic-node">
                    <button
                      class="category-link subtopic-item {isActive(tag, currentActivePath) ? 'active' : ''}"
                      on:click={() => selectCategory(tag)}
                    >
                      {tag.label} ({tag.count})
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </li>
  </ul>
</div>

<div class="sidebar-module motion-reveal">
  <h4>About</h4>
  <p>A Thought Trajectory Architect turning hidden decision paths behind AI products into explicit, sharable architecture.</p>
  <br>
  <p>Check my <a href={resumeUrl} on:click={goResume}>resume</a></p>
</div>

<style>
  .sidebar-header {
    padding: 4.75rem 1.15rem 1.2rem;
    border-bottom: 1px solid rgb(39 39 42 / 85%);
    background: linear-gradient(180deg, rgb(24 24 27 / 72%), rgb(9 9 11 / 35%));
    position: relative;
  }

  .profile-section {
    text-align: left;
    animation-delay: 0.05s;
  }

  .avatar-link {
    display: inline-block;
    margin-bottom: 0.8rem;
  }

  .avatar {
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    border: 1px solid rgb(63 63 70);
  }

  .site-name {
    margin: 0 0 0.35rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: #fafafa;
  }

  .site-description {
    margin: 0;
    color: #a1a1aa;
    font-size: 0.78rem;
    line-height: 1.55;
  }

  .sidebar-module {
    padding: 1rem 1.15rem 1.1rem;
    margin-bottom: 0;
    border-bottom: 1px solid rgb(39 39 42 / 70%);
    will-change: transform, opacity;
  }

  .sidebar-module:last-child {
    border-bottom: none;
  }

  .sidebar-module h4 {
    margin: 0 0 0.65rem 0;
    padding: 0 0.55rem;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #71717a;
  }

  .category-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .category-list li {
    margin-bottom: 0.2rem;
  }

  .motion-reveal {
    animation: sideReveal 0.52s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .sidebar-module.motion-reveal:nth-of-type(2) {
    animation-delay: 0.09s;
  }

  .sidebar-module.motion-reveal:nth-of-type(3) {
    animation-delay: 0.16s;
  }

  .motion-stagger-list > li,
  .motion-stagger-list .category-node,
  .motion-stagger-list .subtopic-node {
    animation: sideReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .motion-stagger-list > li {
    animation-delay: 0.12s;
  }

  .motion-stagger-list .category-node:nth-child(1) {
    animation-delay: 0.14s;
  }

  .motion-stagger-list .category-node:nth-child(2) {
    animation-delay: 0.17s;
  }

  .motion-stagger-list .category-node:nth-child(3) {
    animation-delay: 0.2s;
  }

  .all-posts-link {
    margin-bottom: 0.25rem;
  }

  .category-tree {
    list-style: none;
    margin: 0 0 0 0.55rem;
    padding: 0 0 0 0.7rem;
    border-left: 1px solid rgb(63 63 70 / 70%);
  }

  .category-node {
    margin-bottom: 0.12rem;
  }

  .category-level {
    font-size: 0.8rem;
    color: #d4d4d8;
    padding-left: 0.5rem;
  }

  .subtopic-tree {
    list-style: none;
    margin: 0.1rem 0 0.18rem 0.4rem;
    padding: 0 0 0 0.7rem;
    border-left: 1px solid rgb(63 63 70 / 70%);
  }

  .subtopic-node {
    margin-bottom: 0.1rem;
  }

  .category-link {
    background: transparent;
    border: 1px solid transparent;
    color: #a1a1aa;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 0.45rem 0.55rem;
    text-align: left;
    width: 100%;
    transition:
      transform 0.24s ease,
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease;
    border-radius: 0.6rem;
  }

  .category-link:hover {
    color: #e4e4e7;
    background: rgb(39 39 42 / 55%);
    border-color: rgb(63 63 70 / 90%);
    transform: translateX(2px);
  }

  .category-link.active {
    color: #fafafa;
    font-weight: 600;
    background: rgb(39 39 42 / 85%);
    border-color: rgb(82 82 91);
  }

  .category-link.subtopic-item {
    font-size: 0.76rem;
    color: #a1a1aa;
    padding-left: 0.95rem;
  }

  .category-link.subtopic-item:hover {
    color: #d4d4d8;
    background: rgb(39 39 42 / 40%);
    border-color: rgb(63 63 70 / 70%);
    padding-left: 0.95rem;
  }

  .category-link.subtopic-item.active {
    color: #f4f4f5;
    font-weight: 500;
    background: rgb(39 39 42 / 65%);
    border-color: rgb(82 82 91 / 85%);
    padding-left: 0.95rem;
  }

  @keyframes sideReveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .motion-reveal,
    .motion-stagger-list > li,
    .motion-stagger-list .category-node,
    .motion-stagger-list .subtopic-node {
      animation-duration: 0.01ms;
      animation-iteration-count: 1;
    }

    .category-link {
      transition-duration: 0.01ms;
    }
  }

  .sidebar-module p {
    color: #a1a1aa;
    font-size: 0.8rem;
    line-height: 1.7;
    margin: 0;
  }

  .sidebar-module a {
    color: #e4e4e7;
    text-decoration: underline;
    text-underline-offset: 0.12rem;
  }

  </style>
