// Post creation standard tests - validates bilingual post requirements
// Updated: metric bar alignment, sidebar h4 padding, post content wording, mission statement
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

function parseFrontmatter(content: string) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;
	const frontmatter = match[1];
	const fields: Record<string, string> = {};
	for (const line of frontmatter.split("\n")) {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();
			fields[key] = value;
		}
	}
	return fields;
}

describe("post creation standard", () => {
	const slug = "2026-04-02-21";
	const enPath = `src/posts/project/${slug}.md`;
	const koPath = `src/posts/ko/project/${slug}.md`;

	test("Given bilingual posts When checking existence Then both English and Korean versions exist", () => {
		expect(fs.existsSync(path.join(root, enPath))).toBe(true);
		expect(fs.existsSync(path.join(root, koPath))).toBe(true);
	});

	test("Given English post frontmatter When parsing Then required fields exist", () => {
		const content = read(enPath);
		const frontmatter = parseFrontmatter(content);
		expect(frontmatter).not.toBeNull();
		expect(frontmatter?.layout).toBe("post");
		expect(frontmatter?.title).toBeTruthy();
		expect(frontmatter?.date).toMatch(
			/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} -0000$/,
		);
		expect(frontmatter?.tags).toBeTruthy();
		const tags = frontmatter?.tags?.split(",").map((t) => t.trim()) || [];
		expect(tags.length).toBeGreaterThanOrEqual(3);
		expect(["Project", "Company Work"]).toContain(frontmatter?.category);
		expect(frontmatter?.description).toBeTruthy();
	});

	test("Given Korean post frontmatter When parsing Then required fields exist", () => {
		const content = read(koPath);
		const frontmatter = parseFrontmatter(content);
		expect(frontmatter).not.toBeNull();
		expect(frontmatter?.layout).toBe("post");
		expect(frontmatter?.title).toBeTruthy();
		expect(frontmatter?.date).toMatch(
			/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} -0000$/,
		);
		expect(frontmatter?.tags).toBeTruthy();
		const tags = frontmatter?.tags?.split(",").map((t) => t.trim()) || [];
		expect(tags.length).toBeGreaterThanOrEqual(3);
		expect(["Project", "Company Work"]).toContain(frontmatter?.category);
		expect(frontmatter?.description).toBeTruthy();
	});

	test("Given Axiom-related post When checking content Then project name is 'Axiom' not 'Axiom Enterprise'", () => {
		const enContent = read(enPath);
		const koContent = read(koPath);
		expect(enContent).not.toContain("Axiom Enterprise");
		expect(koContent).not.toContain("Axiom Enterprise");
		expect(enContent).toContain("Axiom");
		expect(koContent).toContain("Axiom");
	});

	test("Given bilingual posts When comparing structure Then both have matching section headers", () => {
		const enContent = read(enPath);
		const koContent = read(koPath);
		const enHeaders = enContent.match(/^## .+$/gm) || [];
		const koHeaders = koContent.match(/^## .+$/gm) || [];
		expect(enHeaders.length).toBeGreaterThan(0);
		expect(koHeaders.length).toBeGreaterThan(0);
		expect(enHeaders.length).toBe(koHeaders.length);
	});
});
