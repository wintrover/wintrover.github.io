<script lang="ts">
import { push } from "svelte-spa-router";
import categoryConfig from "../lib/categories.json";
import { siteConfig } from "../lib/config";
import { slugify } from "../lib/utils";
import { selectedCategory } from "../stores/category";
import { posts } from "../stores/posts";

type SidebarItem = {
	label: string;
	slug: string;
	count: number;
	value: string;
	isTag?: boolean;
	parentSlug?: string;
};

type CategoryGroup = {
	category: SidebarItem;
	tags: SidebarItem[];
};

let allPostsItem: SidebarItem = {
	label: "All Posts",
	slug: "all",
	count: 0,
	value: "all",
};
let categoryGroups: CategoryGroup[] = [];
let resumeUrl = "/resume/";

void siteConfig;
void posts;

$: resumeUrl = "/resume/";

$: {
	const configuredTagsByCategoryName: Record<string, string[]> = {};
	const categoryEntries = (categoryConfig as any)?.categories ?? {};
	for (const entry of Object.values(categoryEntries)) {
		const name = (entry as any)?.name;
		const tags = (entry as any)?.tags;
		if (typeof name === "string" && name) {
			configuredTagsByCategoryName[name] = Array.isArray(tags)
				? tags.map((t) => String(t)).filter(Boolean)
				: [];
		}
	}
	const categoriesWithConfiguredTags = new Set(
		Object.entries(configuredTagsByCategoryName)
			.filter(([, tags]) => Array.isArray(tags) && tags.length > 0)
			.map(([name]) => name),
	);

	const categoryCount: Record<string, number> = {};
	const tagCountByCategory: Record<string, Record<string, number>> = {};

	if (Array.isArray($posts)) {
		$posts.forEach((post) => {
			if (post.category) {
				categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;

				if (categoriesWithConfiguredTags.has(post.category)) {
					tagCountByCategory[post.category] =
						tagCountByCategory[post.category] || {};
					post.tags.forEach((tag) => {
						tagCountByCategory[post.category][tag] =
							(tagCountByCategory[post.category][tag] || 0) + 1;
					});
				}
			}
		});
	}

	allPostsItem = {
		label: "All Posts",
		slug: "all",
		count: Array.isArray($posts) ? $posts.length : 0,
		value: "all",
	};

	const nextCategoryGroups: CategoryGroup[] = [];

	for (const [name, count] of Object.entries(categoryCount).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		const categorySlug = slugify(name);
		const categoryItem: SidebarItem = {
			label: name,
			slug: categorySlug,
			count,
			value: name,
		};
		const tagsForCategory: SidebarItem[] = [];

		if (categoriesWithConfiguredTags.has(name)) {
			const fromConfig = configuredTagsByCategoryName[name] ?? [];
			const fromPosts = Object.keys(tagCountByCategory[name] ?? {});
			const tags = Array.from(new Set([...fromConfig, ...fromPosts]))
				.map((t) => String(t).trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b));

			for (const tag of tags) {
				const tagSlug = slugify(tag);
				tagsForCategory.push({
					label: tag,
					slug: tagSlug,
					count: tagCountByCategory[name]?.[tag] ?? 0,
					value: `${name} - ${tagSlug}`,
					isTag: true,
					parentSlug: categorySlug,
				});
			}
		}

		nextCategoryGroups.push({
			category: categoryItem,
			tags: tagsForCategory,
		});
	}

	categoryGroups = nextCategoryGroups;
}

function selectCategory(item: SidebarItem) {
	if (item.value === "all") {
		selectedCategory.set("all");
		push("/");
	} else if (item.isTag) {
		selectedCategory.set(item.value);
		push(`/category/${item.parentSlug}/tag/${item.slug}`);
	} else {
		selectedCategory.set(item.value);
		push(`/category/${item.slug}`);
	}

	// 모바일 환경에서 카테고리 클릭 시 사이드바 닫기
	if (window.innerWidth < 768) {
		document.dispatchEvent(new CustomEvent("toggle-sidebar"));
	}
}

function goResume(event) {
	event.preventDefault();
	push(resumeUrl);
}

void selectCategory;
void goResume;

function isActive(item: SidebarItem) {
	return (
		($selectedCategory === "all" && item.value === "all") ||
		$selectedCategory === item.value
	);
}

void allPostsItem;
void categoryGroups;
void isActive;
</script>

<div class="sidebar-header">
  <div class="profile-section">
    <div class="avatar-link">
      <img src={siteConfig.avatar} alt={siteConfig.name} class="avatar" />
    </div>
    <h1 class="site-name">
      {siteConfig.name}
    </h1>
    <p class="site-description">{siteConfig.description}</p>
  </div>
</div>

<div class="sidebar-module">
  <h4>Explore</h4>
  <ul class="category-list">
    <li>
      <button
        class="category-link all-posts-link {isActive(allPostsItem) ? 'active' : ''}"
        on:click={() => selectCategory(allPostsItem)}
      >
        {allPostsItem.label} ({allPostsItem.count})
      </button>
      <ul class="category-tree">
        {#each categoryGroups as group}
          <li class="category-node">
            <button
              class="category-link category-level {isActive(group.category) ? 'active' : ''}"
              on:click={() => selectCategory(group.category)}
            >
              {group.category.label} ({group.category.count})
            </button>
            {#if group.tags.length > 0}
              <ul class="tag-tree">
                {#each group.tags as tag}
                  <li class="tag-node">
                    <button
                      class="category-link tag-item {isActive(tag) ? 'active' : ''}"
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

<div class="sidebar-module">
  <h4>About</h4>
  <p>Product engineer & builder, shipping AI-powered products and sharing learnings from the field.</p>
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
  }

  .sidebar-module:last-child {
    border-bottom: none;
  }

  .sidebar-module h4 {
    margin: 0 0 0.65rem 0;
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

  .tag-tree {
    list-style: none;
    margin: 0.1rem 0 0.18rem 0.4rem;
    padding: 0 0 0 0.7rem;
    border-left: 1px solid rgb(63 63 70 / 70%);
  }

  .tag-node {
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
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease;
    border-radius: 0.6rem;
  }

  .category-link:hover {
    color: #e4e4e7;
    background: rgb(39 39 42 / 55%);
    border-color: rgb(63 63 70 / 90%);
  }

  .category-link.active {
    color: #fafafa;
    font-weight: 600;
    background: rgb(39 39 42 / 85%);
    border-color: rgb(82 82 91);
  }

  .category-link.tag-item {
    font-size: 0.76rem;
    color: #a1a1aa;
    padding-left: 0.95rem;
    position: relative;
  }

  .category-link.tag-item:before {
    content: "#";
    position: absolute;
    left: 0.35rem;
    color: #52525b;
  }

  .category-link.tag-item:hover {
    color: #d4d4d8;
    background: rgb(39 39 42 / 40%);
    border-color: rgb(63 63 70 / 70%);
    padding-left: 0.95rem;
  }

  .category-link.tag-item.active {
    color: #f4f4f5;
    font-weight: 500;
    background: rgb(39 39 42 / 65%);
    border-color: rgb(82 82 91 / 85%);
    padding-left: 0.95rem;
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
