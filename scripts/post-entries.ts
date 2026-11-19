import fs from "node:fs";
import path from "node:path";
import { logError } from "../src/lib/log";
import { parseFrontMatter, slugify } from "../src/lib/utils";

type FrontmatterData = Record<string, unknown>;

export type PostEntry = {
	slug: string;
	lastmod: string | null;
	title: string;
	description: string;
	date: string | null;
};

export function walkMarkdownFiles(rootDir: string) {
	const results: string[] = [];
	const stack: string[] = [rootDir];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;
		const entries = fs.readdirSync(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
				results.push(full);
			}
		}
	}
	return results;
}

function toLastMod(value: unknown) {
	if (typeof value !== "string") return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
}

export function resolvePostSlug(title: string, fileName: string): string {
	return slugify(title) || slugify(fileName);
}

export function collectPostEntries(
	root: string,
	locale: "ko" | "en",
): PostEntry[] {
	const postsRoot = path.join(root, "src", "posts");
	const koRoot = path.join(postsRoot, "ko");
	const files =
		locale === "ko"
			? fs.existsSync(koRoot)
				? walkMarkdownFiles(koRoot)
				: []
			: fs.existsSync(postsRoot)
				? walkMarkdownFiles(postsRoot).filter((p) => {
						const rel = path.relative(postsRoot, p).replaceAll("\\", "/");
						return !rel.toLowerCase().startsWith("ko/");
					})
				: [];

	const entries: PostEntry[] = [];
	const seen = new Map<string, string>();
	for (const filePath of files) {
		const fileName = path.basename(filePath, ".md");
		const raw = fs.readFileSync(filePath, "utf8");
		const { data } = parseFrontMatter(raw);
		const frontmatter = data as FrontmatterData;
		const title =
			typeof frontmatter.title === "string" ? frontmatter.title : "";
		const slug = resolvePostSlug(title, fileName);
		const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
		if (!slug) {
			logError("build-github", `Post slug cannot be derived: ${relativePath}`, {
				error: new Error(`empty post slug: ${relativePath}`),
			});
			process.exit(1);
		}
		const duplicatePath = seen.get(slug);
		if (duplicatePath) {
			logError(
				"build-github",
				`Duplicate post slug "${slug}" in ${locale} locale: ${duplicatePath} and ${relativePath}`,
				{ error: new Error(`duplicate post slug: ${slug}`) },
			);
			process.exit(1);
		}
		seen.set(slug, relativePath);
		const dateRaw =
			typeof frontmatter.date === "string" ? frontmatter.date : null;
		const lastmod = toLastMod(dateRaw);
		const excerpt =
			typeof frontmatter.excerpt === "string"
				? frontmatter.excerpt
				: typeof frontmatter.description === "string"
					? frontmatter.description
					: "";
		entries.push({
			slug,
			lastmod,
			title: title || fileName,
			description: excerpt || title || fileName,
			date: dateRaw,
		});
	}
	return entries;
}
