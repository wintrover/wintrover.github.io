import categoryConfig from "./categories.json";
import { postFiles } from "./glob";
import { parseMarkdown } from "./markdown";
import { parseFrontMatter, slugify } from "./utils";

function determineCategoryFromPath(path: string) {
	const pathParts = path.split("/");
	const folderName = pathParts[pathParts.length - 2];
	const folderMapping: Record<string, string> = {
		project: "Project",
		company: "Company Work",
		tutorial: "Tutorial",
		general: "General",
	};
	return folderMapping[folderName] || (categoryConfig as any).defaultCategory;
}

function processPostMetadata(
	path: string,
	data: Record<string, any>,
	markdownBody: string,
) {
	const fileName = path.split("/").pop()?.replace(".md", "") || "";
	let category = data.category;
	if ((categoryConfig as any).autoAssignByFolder && !category) {
		category = determineCategoryFromPath(path);
	}

	const { html: htmlContent } = parseMarkdown(markdownBody);

	return {
		fileName,
		slug: slugify(data.title || fileName || ""),
		title: data.title || fileName,
		date: data.date || new Date().toISOString().split("T")[0],
		category: category || (categoryConfig as any).defaultCategory,
		tags: data.tags || [],
		excerpt: data.excerpt || data.description || "",
		folder: path.split("/")[path.split("/").length - 2],
		html: htmlContent,
		...data,
	};
}

export async function loadAllPosts(
	modulesOverride?: Record<string, string | null>,
) {
	try {
		const modules = modulesOverride || postFiles;
		const posts: any[] = [];

		for (const [path, content] of Object.entries(modules)) {
			try {
				if (!content) continue;

				const { data, content: markdownBody } = parseFrontMatter(content);
				const post = processPostMetadata(path, data, markdownBody);
				posts.push({
					...post,
					content: markdownBody,
				});
			} catch (postError) {
				console.error(`❌ [postLoader] 포스트 파싱 중 에러 발생 (${path}):`, {
					message:
						postError instanceof Error ? postError.message : String(postError),
					stack:
						postError instanceof Error
							? postError.stack
							: "Stack trace unavailable",
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
				console.error("❌ [postLoader] 포스트 정렬 중 에러 발생:", {
					message:
						sortError instanceof Error ? sortError.message : String(sortError),
					stack:
						sortError instanceof Error
							? sortError.stack
							: "Stack trace unavailable",
					error: sortError,
				});
				return 0;
			}
		});
	} catch (error) {
		console.error("❌ [postLoader] 포스트 로딩 중 치명적 에러 발생:", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : "Stack trace unavailable",
			error,
		});
		return [];
	}
}

export async function loadPostBySlug(
	slug: string,
	modulesOverride?: Record<string, string | null>,
) {
	try {
		const modules = (modulesOverride || postFiles) as Record<string, string>;
		let target: { path: string; content: string } | null = null;

		for (const path in modules) {
			const content = modules[path];
			if (content === null || content === undefined) continue;

			const fileName = path.split("/").pop()?.replace(".md", "") || "";
			const { data } = parseFrontMatter(content);
			const postSlug = slugify(data.title || fileName || "");

			if (postSlug === slug) {
				target = { path, content };
				break;
			}
		}

		if (target === null) {
			console.warn(
				`⚠️ [postLoader] 해당 슬러그에 대한 포스트를 찾을 수 없음: ${slug}`,
			);
			return null;
		}

		const { data, content: markdownBody } = parseFrontMatter(target.content);
		const post = processPostMetadata(target.path, data, markdownBody);

		return {
			...post,
			content: markdownBody,
		};
	} catch (error) {
		console.error(
			`❌ [postLoader] 슬러그(${slug})로 포스트 로딩 중 에러 발생:`,
			{
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : "Stack trace unavailable",
				error,
			},
		);
		return null;
	}
}
