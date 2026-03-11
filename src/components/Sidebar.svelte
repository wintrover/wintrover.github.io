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

let categories: SidebarItem[] = [];

void siteConfig;
void posts;

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

	const categoryCount: Record<string, number> = {};
	const tagCountByCategory: Record<string, Record<string, number>> = {};

	if (Array.isArray($posts)) {
		$posts.forEach((post) => {
			if (post.category) {
				categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;

				if (post.category === "Company Work" || post.category === "Project") {
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

	const nextCategories: SidebarItem[] = [
		{
			label: "All Posts",
			slug: "all",
			count: Array.isArray($posts) ? $posts.length : 0,
			value: "all",
		},
	];

	for (const [name, count] of Object.entries(categoryCount)) {
		const categorySlug = slugify(name);
		nextCategories.push({
			label: name,
			slug: categorySlug,
			count,
			value: name,
		});

		if (name === "Company Work" || name === "Project") {
			const fromConfig = configuredTagsByCategoryName[name] ?? [];
			const fromPosts = Object.keys(tagCountByCategory[name] ?? {});
			const tags = Array.from(new Set([...fromConfig, ...fromPosts]))
				.map((t) => String(t).trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b));

			for (const tag of tags) {
				const tagSlug = slugify(tag);
				nextCategories.push({
					label: tag,
					slug: tagSlug,
					count: tagCountByCategory[name]?.[tag] ?? 0,
					value: `${name} - ${tagSlug}`,
					isTag: true,
					parentSlug: categorySlug,
				});
			}
		}
	}

	categories = nextCategories;
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

function goHome(event) {
	event.preventDefault();
	selectedCategory.set("all");
	push("/");
}

void categories;
void selectCategory;
void goHome;
</script>

<div class="sidebar-header">
  <div class="profile-section">
    <a href={siteConfig.baseUrl + '/'} class="avatar-link" on:click={goHome}>
      <img src={siteConfig.avatar} alt={siteConfig.name} class="avatar" />
    </a>
    <h1 class="site-name">
      {siteConfig.name}
    </h1>
    <p class="site-description">{siteConfig.description}</p>
  </div>
</div>

<div class="sidebar-module">
  <h4>Categories</h4>
  <ul class="category-list">
    {#each categories as category}
      <li>
        <button
          class="category-link {category.isTag ? 'tag-item' : ''} {($selectedCategory === 'all' && category.value === 'all') || ($selectedCategory === category.value) ? 'active' : ''}"
          on:click={() => selectCategory(category)}
        >
          {category.label} ({category.count})
        </button>
      </li>
    {/each}
  </ul>
</div>

<div class="sidebar-module">
  <h4>About</h4>
  <p>Working as a Fullstack AI Application Architect, sharing the latest tech trends and development experiences.</p>
  <br>
  <p>Check my resume <a href="https://wintrover.github.io/resume/" target="_blank" rel="noopener noreferrer">wintrover.github.io/resume</a></p>
</div>

<style>
  .sidebar-header {
    padding: 30px 20px;
    border-bottom: 1px solid #e1e4e8;
    background: white;
    position: relative;
  }

  .profile-section {
    text-align: center;
    /* 토글 버튼 공간 확보 제거 */
  }

  .avatar-link {
    display: inline-block;
    margin-bottom: 15px;
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 3px solid #e1e4e8;
    transition: border-color 0.2s;
  }

  .avatar:hover {
    border-color: #0366d6;
  }

  .site-name {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #24292e;
  }

  .site-description {
    margin: 0;
    color: #586069;
    font-size: 14px;
    line-height: 1.4;
  }

  .sidebar-module {
    padding: 20px;
    margin-bottom: 0;
    border-bottom: 1px solid #e1e4e8;
  }

  .sidebar-module:last-child {
    border-bottom: none;
  }

  .sidebar-module h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 600;
    color: #24292e;
  }

  .category-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .category-list li {
    margin-bottom: 6px;
  }

  .category-link {
    background: none;
    border: none;
    color: #0366d6;
    cursor: pointer;
    font-size: 14px;
    padding: 6px 0;
    text-align: left;
    width: 100%;
    transition: color 0.2s;
    border-radius: 4px;
  }

  .category-link:hover {
    color: #0256cc;
    background: #f1f8ff;
    padding-left: 8px;
  }

  .category-link.active {
    color: #0256cc;
    font-weight: 600;
    background: #f1f8ff;
    padding-left: 8px;
  }

  .category-link.tag-item {
    font-size: 13px;
    color: #6a737d;
    padding-left: 16px;
    position: relative;
  }

  .category-link.tag-item:before {
    content: "#";
    position: absolute;
    left: 8px;
    color: #6a737d;
  }

  .category-link.tag-item:hover {
    color: #0366d6;
    background: #f6f8fa;
    padding-left: 16px;
  }

  .category-link.tag-item.active {
    color: #0366d6;
    font-weight: 500;
    background: #f6f8fa;
    padding-left: 16px;
  }

  .sidebar-module p {
    color: #586069;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  </style>
