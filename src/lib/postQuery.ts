import type { Post } from "./postLoader";
import { slugify } from "./utils";

type PostRouteParams = {
	category?: string;
	tag?: string;
};

type PostFilterResult = {
	filteredPosts: Post[];
	selectedCategoryValue: string;
	categoryLabel: string;
	tagLabel: string;
};

type CategoryConfigLike = {
	categories?: Record<string, { name?: unknown; tags?: unknown }>;
};

const sidebarSubtopics = ["SMBholdings", "CVFactory", "Devlog"] as const;
const subtopicLabelByLowercase = Object.fromEntries(
	sidebarSubtopics.map((subtopic) => [subtopic.toLowerCase(), subtopic]),
) as Record<string, string>;

function resolveSidebarSubtopicLabel(raw: string): string | null {
	const normalized = raw.trim().toLowerCase();
	if (!normalized) return null;
	return subtopicLabelByLowercase[normalized] ?? null;
}

export type SidebarItem = {
	label: string;
	slug: string;
	count: number;
	value: string;
	isTag?: boolean;
	parentSlug?: string;
};

export type CategoryGroup = {
	category: SidebarItem;
	tags: SidebarItem[];
};

export function toPostArray(value: unknown): Post[] {
	return Array.isArray(value) ? (value as Post[]) : [];
}

export function filterPostsByRoute(
	posts: Post[],
	params: PostRouteParams,
): PostFilterResult {
	if (params.category) {
		const categoryPosts = posts.filter(
			(post) => slugify(post.category) === params.category,
		);

		if (params.tag) {
			const filteredPosts = categoryPosts.filter((post) =>
				post.tags.some((tag) => slugify(tag) === params.tag),
			);
			return {
				filteredPosts,
				selectedCategoryValue: `${categoryPosts[0]?.category || "all"} - ${params.tag}`,
				categoryLabel: filteredPosts[0]?.category || params.category,
				tagLabel: params.tag,
			};
		}

		return {
			filteredPosts: categoryPosts,
			selectedCategoryValue: categoryPosts[0]?.category || "all",
			categoryLabel: categoryPosts[0]?.category || params.category,
			tagLabel: "",
		};
	}

	return {
		filteredPosts: posts,
		selectedCategoryValue: "all",
		categoryLabel: "",
		tagLabel: "",
	};
}

export function buildSidebarData(
	posts: Post[],
	config: CategoryConfigLike,
): {
	allPostsItem: SidebarItem;
	categoryGroups: CategoryGroup[];
} {
	const configuredTagsByCategoryName: Record<string, string[]> = {};
	const categoryEntries = config?.categories ?? {};
	for (const entry of Object.values(categoryEntries)) {
		const name = entry?.name;
		const tags = entry?.tags;
		if (typeof name === "string" && name) {
			configuredTagsByCategoryName[name] = Array.isArray(tags)
				? tags
						.map((tag) => resolveSidebarSubtopicLabel(String(tag)))
						.filter((tag): tag is string => Boolean(tag))
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

	for (const post of posts) {
		if (!post.category) continue;
		categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;

		if (categoriesWithConfiguredTags.has(post.category)) {
			tagCountByCategory[post.category] =
				tagCountByCategory[post.category] || {};
			for (const tag of post.tags) {
				const subtopicLabel = resolveSidebarSubtopicLabel(String(tag));
				if (!subtopicLabel) continue;
				tagCountByCategory[post.category][subtopicLabel] =
					(tagCountByCategory[post.category][subtopicLabel] || 0) + 1;
			}
		}
	}

	const allPostsItem: SidebarItem = {
		label: "All Posts",
		slug: "all",
		count: posts.length,
		value: "all",
	};

	const categoryGroups: CategoryGroup[] = [];

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
				.map((tag) => resolveSidebarSubtopicLabel(String(tag)))
				.filter((tag): tag is string => Boolean(tag))
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

		categoryGroups.push({
			category: categoryItem,
			tags: tagsForCategory,
		});
	}

	return {
		allPostsItem,
		categoryGroups,
	};
}
