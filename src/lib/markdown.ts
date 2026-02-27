import { marked } from "marked";
import mermaid from "mermaid";
import { postFiles } from "./glob";
import { normalizeImageSrc, parseFrontMatter } from "./utils";

export async function loadPost(slug: string) {
	const filePath = (postFiles as Record<string, string>)[slug];
	if (!filePath) {
		return null;
	}
	try {
		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
		}
		const content = await response.text();
		return parseMarkdown(content);
	} catch (error) {
		console.error("❌ [markdown] 포스트 로딩 중 에러 발생:", {
			slug,
			filePath,
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : "Stack trace unavailable",
			error,
		});
		return null;
	}
}

export function parseMarkdown(content: string) {
	try {
		const { data: frontMatter, content: markdownBody } =
			parseFrontMatter(content);
		const htmlRaw = marked.parse(markdownBody, { async: false }) as string;

		const html = htmlRaw.replace(
			/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g,
			(m: string, src: string) => {
				const fixed = normalizeImageSrc(src);
				return m.replace(src, fixed);
			},
		);

		return {
			frontMatter,
			html,
		};
	} catch (error) {
		console.error("❌ [markdown] 마크다운 파싱 중 에러 발생:", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : "Stack trace unavailable",
			error,
		});
		return {
			frontMatter: {},
			html: `<p>Error parsing markdown: ${error instanceof Error ? error.message : String(error)}</p>`,
		};
	}
}

export function initMermaid() {
	mermaid.initialize({
		startOnLoad: true,
		theme: "default",
		securityLevel: "loose",
	});
}
