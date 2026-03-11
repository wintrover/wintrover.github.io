import categoryConfig from "./categories.json";
import { postFiles } from "./glob";
import { logError, logWarn } from "./log";
import { renderMarkdownBody } from "./markdown";
import { parseFrontMatter, slugify } from "./utils";

type CategoryEntry = {
	name: string;
	description?: string;
	slug?: string;
	color?: string;
	icon?: string;
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
	return Array.isArray(parts) ? parts.filter(Boolean) : [];
}

function normalizeTags(tags: unknown) {
	if (Array.isArray(tags)) {
		return tags.map((t) => String(t)).filter(Boolean);
	}
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	}
	return [];
}

function determineCategoryFromPath(filePath: string) {
	const pathParts = splitPathParts(filePath);
	const folderName =
		pathParts.length >= 2 ? pathParts[pathParts.length - 2] : "";
	const key = folderName.toLowerCase();
	const folderMapping: Record<string, string> = {
		project: "Project",
		company: "Company Work",
		tutorial: "Tutorial",
		general: "General",
	};
	const fromMapping = folderMapping[key];
	const fromConfig = categories.categories?.[key]?.name;
	return fromMapping || fromConfig || categories.defaultCategory;
}

function getFileNameFromPath(filePath: string) {
	return splitPathParts(filePath).pop()?.replace(".md", "") || "";
}

function derivePostSlug(data: PostFrontMatter, fileName: string) {
	const title = typeof data.title === "string" ? data.title : "";
	return slugify(title || fileName || "");
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

	return {
		...data,
		fileName,
		slug,
		title: title || fileName,
		date,
		category: category || categories.defaultCategory,
		tags: normalizeTags(data.tags),
		excerpt,
		folder,
		html: htmlContent,
	} as PostBase;
}

export async function loadAllPosts(
	modulesOverride?: Record<string, string | null>,
): Promise<Post[]> {
	try {
		const modules: Record<string, string | null> = modulesOverride || postFiles;
		const posts: Post[] = [];

		for (const [path, content] of Object.entries(modules)) {
			try {
				if (content === null || content === undefined) continue;

				const { data, content: markdownBody } = parseFrontMatter(content);
				const post = processPostMetadata(
					path,
					data as PostFrontMatter,
					markdownBody,
				);
				posts.push({
					...post,
					content: markdownBody,
				} as Post);
			} catch (postError) {
				logError("postLoader", "포스트 파싱 중 에러 발생", {
					path,
					error: postError,
				});
			}
		}

		return posts.sort((a, b) => {
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
		const modules: Record<string, string | null> = modulesOverride || postFiles;
		let target: { path: string; content: string } | null = null;

		for (const path in modules) {
			const content = modules[path];
			if (content === null || content === undefined) continue;

			const fileName = getFileNameFromPath(path);
			const { data } = parseFrontMatter(content);
			const postSlug = derivePostSlug(data as PostFrontMatter, fileName);

			if (postSlug === slug) {
				target = { path, content };
				break;
			}
		}

		if (target === null) {
			logWarn(
				"postLoader",
				`해당 슬러그에 대한 포스트를 찾을 수 없음: ${slug}`,
				{
					slug,
				},
			);
			return null;
		}

		const { data, content: markdownBody } = parseFrontMatter(target.content);
		const post = processPostMetadata(
			target.path,
			data as PostFrontMatter,
			markdownBody,
		);

		return {
			...post,
			content: markdownBody,
		} as Post;
	} catch (error) {
		logError("postLoader", `슬러그(${slug})로 포스트 로딩 중 에러 발생`, {
			slug,
			error,
		});
		return null;
	}
}
