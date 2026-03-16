import { marked } from "marked";
import { logError } from "./log";
import { normalizeImageSrc, parseFrontMatter } from "./utils";

export function renderMarkdownBody(markdownBody: string) {
	const htmlRaw = marked.parse(markdownBody, { async: false }) as string;

	return htmlRaw.replace(/<img\b[^>]*>/g, (tag: string) =>
		tag.replace(
			/\bsrc\s*=\s*(["'])([^"']+)\1/,
			(_full: string, q: string, src: string) =>
				`src=${q}${normalizeImageSrc(src)}${q}`,
		),
	);
}

export function parseMarkdown(content: string) {
	try {
		const { data: frontMatter, content: markdownBody } =
			parseFrontMatter(content);
		const html = renderMarkdownBody(markdownBody);

		return {
			frontMatter,
			html,
		};
	} catch (error) {
		logError("markdown", "마크다운 파싱 중 에러 발생", {
			error,
		});
		return {
			frontMatter: {},
			html: `<p>Error parsing markdown: ${error instanceof Error ? error.message : String(error)}</p>`,
		};
	}
}
