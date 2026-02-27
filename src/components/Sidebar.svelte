<script lang="ts">
import { push } from "svelte-spa-router";
import { siteConfig } from "../lib/config";
import { slugify } from "../lib/utils";
import { selectedCategory } from "../stores/category";
import { posts } from "../stores/posts";

let categories = [];

void siteConfig;
void posts;

$: {
	const categoryCount = {};
	const tagCount = {};

	if (Array.isArray($posts)) {
		$posts.forEach((post) => {
			if (post.category) {
				categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;

				// Company Work과 Project 카테고리의 태그별 카운트
				if (post.category === "Company Work" || post.category === "Project") {
					post.tags.forEach((tag) => {
						const tagKey = `${post.category} - ${tag}`;
						tagCount[tagKey] = (tagCount[tagKey] || 0) + 1;
					});
				}
			}
		});
	}

	categories = [
		{
			name: "All Posts",
			slug: "all",
			count: Array.isArray($posts) ? $posts.length : 0,
		},
		...Object.entries(categoryCount).map(([name, count]) => ({
			name,
			slug: slugify(name),
			count,
			isCategory: true,
		})),
	];
}

function selectCategory(categorySlug, categoryName) {
	// slug 대신 실제 카테고리 이름을 저장
	if (categorySlug === "all") {
		selectedCategory.set("all");
		push("/");
	} else {
		selectedCategory.set(categoryName);
		push(`/category/${categorySlug}`);
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
          class="category-link {category.isTag ? 'tag-item' : ''} {($selectedCategory === 'all' && category.slug === 'all') || ($selectedCategory === category.name) ? 'active' : ''}"
          on:click={() => selectCategory(category.slug, category.name)}
        >
          {category.name} ({category.count})
        </button>
      </li>
    {/each}
  </ul>
</div>

<div class="sidebar-module">
  <h4>About</h4>
  <p>Working as a Fullstack AI Application Architect, sharing the latest tech trends and development experiences.</p>
  <br>
  <p>Check my resume <a href="https://wintrover.github.io" target="_blank" rel="noopener noreferrer">wintrover.github.io</a></p>
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
  }

  .site-name a {
    color: #24292e;
    text-decoration: none;
    transition: color 0.2s;
  }

  .site-name a:hover {
    color: #0366d6;
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
