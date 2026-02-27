import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { processMermaidDiagrams } from "./mermaid-to-image";

const baseUrl =
	process.env.BLOG_PUBLIC_BASE_URL || "https://wintrover.github.io/blog";
const postsRoot = "src/posts";

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
		await processMermaidDiagrams(
			content,
			baseUrl as string,
			"public/images",
			filenameBase,
		);
	}
	console.log("OK: mermaid images generated");
}

run().catch((err) => {
	console.error(err?.stack || String(err));
	process.exit(1);
});
