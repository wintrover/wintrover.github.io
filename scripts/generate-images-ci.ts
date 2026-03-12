import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { logError } from "../src/lib/log";
import { processMermaidDiagrams } from "./mermaid-to-image";

const postsRoot = "src/posts";

function splitFrontMatter(raw: string) {
	const lines = raw.split(/\r?\n/);
	if (lines[0] !== "---") {
		return { frontMatterBlock: null as string | null, body: raw };
	}
	const endIndexAfterFirstLine = lines
		.slice(1)
		.findIndex((line) => line.trim() === "---");
	if (endIndexAfterFirstLine === -1) {
		return { frontMatterBlock: null as string | null, body: raw };
	}
	const endIndex = endIndexAfterFirstLine + 1;
	const frontMatterBlock = lines.slice(0, endIndex + 1).join("\n");
	const body = lines
		.slice(endIndex + 1)
		.join("\n")
		.replace(/^\n+/, "");
	return { frontMatterBlock, body };
}

async function listMarkdownFiles(dir: string) {
	const out: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const e of entries) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			const sub = await listMarkdownFiles(p);
			out.push(...sub);
		} else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
			out.push(p);
		}
	}
	return out;
}

function deriveFilenameBase(filePath: string, frontmatter: any) {
	const base = path.basename(filePath, path.extname(filePath));
	const m = base.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d+))?$/);
	const datePart = m?.[1] || String(frontmatter?.date || "");
	const numPart = m?.[2] || "0";
	const prefix = datePart || "unknown";
	return `${prefix}-${numPart}`;
}

async function run() {
	const files = await listMarkdownFiles(postsRoot);
	for (const f of files) {
		const raw = await fs.readFile(f, "utf-8");
		const { data, content } = matter(raw);
		const filenameBase = deriveFilenameBase(f, data);
		const { content: processedContent } = await processMermaidDiagrams(
			content,
			"/",
			"public/images",
			filenameBase,
		);
		if (processedContent !== content) {
			const { frontMatterBlock } = splitFrontMatter(raw);
			const out = frontMatterBlock
				? `${frontMatterBlock}\n\n${processedContent.trim()}\n`
				: processedContent;
			await fs.writeFile(f, out, "utf-8");
		}
	}
	console.log("OK: mermaid images generated");
}

run().catch((err) => {
	logError("generate-images-ci", "mermaid 이미지 생성 실패", { error: err });
	process.exit(1);
});
