import categoryConfig from "./categories.json";
import { getPostFiles } from "./glob";
import { logError, logWarn } from "./log";
import { renderMarkdownBody } from "./markdown";
import { parseFrontMatter, slugify } from "./utils";

type CategoryEntry = {
	name: string;
	description?: string;
	slug?: string;
	color?: string;
	icon?: string;
	tags?: string[];
};

type CategoryConfig = {
	categories: Record<string, CategoryEntry>;
	defaultCategory: string;
	autoAssignByFolder?: boolean;
};

type PostFrontMatter = Record<string, unknown> & {
	title?: unknown;
	date?: unknown;
	category?: unknown;
	tags?: unknown;
	excerpt?: unknown;
	description?: unknown;
};

type PostBase = Record<string, unknown> & {
	fileName: string;
	slug: string;
	title: string;
	date: string;
	category: string;
	tags: string[];
	excerpt: string;
	folder?: string;
	html: string;
};

export type Post = PostBase & {
	content: string;
};

const categories = categoryConfig as unknown as CategoryConfig;

function splitPathParts(filePath: string) {
	const parts = String(filePath).split(/[\\/]/);
	return parts.filter(Boolean);
}

function normalizeTags(tags: unknown) {
	if (Array.isArray(tags)) {
		return tags.map((t) => String(t)).filter(Boolean);
	}
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
	}
	return [];
}

function normalizeTagsByCategory(tags: string[], categoryName: string) {
	const normalizedCategoryName = categoryName.trim();
	const categoryEntry = Object.values(categories.categories).find(
		(entry) => String(entry.name).trim() === normalizedCategoryName,
	);
	const configuredTags = Array.isArray(categoryEntry?.tags)
		? categoryEntry.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: [];

	if (configuredTags.length === 0) {
		return Array.from(new Set(tags));
	}

	const categorySlug = String(categoryEntry?.slug).trim().toLowerCase();
	const categoryNameToken = categoryName.trim().toLowerCase();
	const genericTokens = new Set(
		[
			categorySlug,
			categoryNameToken,
			"project",
			"company",
			"tutorial",
			"general",
		]
			.map((token) => token.trim())
			.filter(Boolean),
	);

	const nextTags: string[] = [];
	for (const rawTag of tags) {
		const tag = String(rawTag).trim();
		if (genericTokens.has(tag.toLowerCase())) {
			nextTags.push(...configuredTags);
			continue;
		}
		nextTags.push(tag);
	}

	if (nextTags.length === 0) {
		nextTags.push(...configuredTags);
	}

	return Array.from(new Set(nextTags));
}

function determineCategoryFromPath(filePath: string) {
	const pathParts = splitPathParts(filePath);
	const folderName =
		pathParts.length >= 2 ? pathParts[pathParts.length - 2] : "";
	const key = folderName.toLowerCase();
	const fromConfig = Object.hasOwn(categories.categories, key)
		? categories.categories[key]?.name
		: undefined;
	if (fromConfig) return fromConfig;
	const fallbackByKey = new Map<string, string>([
		["project", "Project"],
		["company", "Company Work"],
		["tutorial", "Tutorial"],
		["general", "General"],
	]);
	const fallback = fallbackByKey.get(key);
	if (fallback) return fallback;
	return categories.defaultCategory;
}

function derivePostSlug(data: PostFrontMatter, fileName: string) {
	const title = typeof data.title === "string" ? data.title : "";
	const titleSlug = slugify(title);
	if (titleSlug) {
		return titleSlug;
	}
	return slugify(fileName || "");
}

function toLegacyCanonicalSlug(value: string) {
	return String(value)
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

function processPostMetadata(
	filePath: string,
	data: PostFrontMatter,
	markdownBody: string,
): PostBase {
	const pathParts = splitPathParts(filePath);
	const fileNamePart =
		pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";
	const fileName = fileNamePart.replace(".md", "");
	const folder = pathParts[pathParts.length - 2];
	let category =
		typeof data.category === "string" && data.category ? data.category : "";
	if (categories.autoAssignByFolder && !category) {
		category = determineCategoryFromPath(filePath);
	}

	const htmlContent = renderMarkdownBody(markdownBody);
	const slug = derivePostSlug(data, fileName);

	const title = typeof data.title === "string" && data.title ? data.title : "";
	const date =
		typeof data.date === "string" && data.date
			? data.date
			: new Date().toISOString().split("T")[0];
	const excerpt =
		typeof data.excerpt === "string" && data.excerpt
			? data.excerpt
			: typeof data.description === "string"
				? data.description
				: "";

	const normalizedTags = normalizeTagsByCategory(
		normalizeTags(data.tags),
		category || categories.defaultCategory,
	);

	return {
		...data,
		fileName,
		slug,
		title: title || fileName,
		date,
		category: category || categories.defaultCategory,
		tags: normalizedTags,
		excerpt,
		folder,
		html: htmlContent,
	} as PostBase;
}

function parsePostFromModule(path: string, content: string): Post | null {
	try {
		const { data, content: markdownBody } = parseFrontMatter(content);
		const post = processPostMetadata(
			path,
			data as PostFrontMatter,
			markdownBody,
		);
		return {
			...post,
			content: markdownBody,
		} as Post;
	} catch (postError) {
		logError("postLoader", "포스트 파싱 중 에러 발생", {
			path,
			error: postError,
		});
		return null;
	}
}

export async function loadAllPosts(
	modulesOverride?: Record<string, string | null>,
): Promise<Post[]> {
	try {
		const modules: Record<string, string | null> =
			modulesOverride || (await getPostFiles());
		const posts: Post[] = [];

		for (const [path, content] of Object.entries(modules)) {
			if (content === null || content === undefined) continue;
			const post = parsePostFromModule(path, content);
			if (post) {
				posts.push(post);
			}
		}

		const sortedPosts = posts.sort((a, b) => {
			try {
				return (
					new Date(b.date).getTime() - new Date(a.date).getTime() ||
					b.slug.localeCompare(a.slug)
				);
			} catch (sortError) {
				logError("postLoader", "포스트 정렬 중 에러 발생", {
					error: sortError,
				});
				return 0;
			}
		});

		return sortedPosts;
	} catch (error) {
		logError("postLoader", "포스트 로딩 중 치명적 에러 발생", {
			error,
		});
		return [];
	}
}

export async function loadPostBySlug(
	slug: string,
	modulesOverride?: Record<string, string | null>,
): Promise<Post | null> {
	try {
		const normalizedSlug = String(slug || "")
			.trim()
			.toLowerCase();
		const modules: Record<string, string | null> =
			modulesOverride || (await getPostFiles());
		for (const [path, content] of Object.entries(modules)) {
			if (content === null || content === undefined) continue;
			const post = parsePostFromModule(path, content);
			if (!post) continue;
			if (post.slug === normalizedSlug) {
				return post;
			}
			const legacyCanonicalSlug = toLegacyCanonicalSlug(
				post.title || post.fileName,
			);
			if (legacyCanonicalSlug === normalizedSlug) {
				return post;
			}
		}
		logWarn("postLoader", `해당 슬러그에 대한 포스트를 찾을 수 없음: ${slug}`, {
			slug,
		});
		return null;
	} catch (error) {
		logError("postLoader", `슬러그(${slug})로 포스트 로딩 중 에러 발생`, {
			slug,
			error,
		});
		return null;
	}
}
