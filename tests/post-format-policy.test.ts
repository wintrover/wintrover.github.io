import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { walkMarkdownFiles } from "../scripts/post-entries";
import { parseFrontMatter } from "../src/lib/utils";

const root = process.cwd();
const subtopicTag = "Axiom for External Repos";

type TargetPost = {
	file: string;
	locale: "en" | "ko";
	title: string;
	body: string;
};

function collectTargets(dir: string, locale: "en" | "ko"): TargetPost[] {
	const absolute = path.join(root, dir);
	if (!fs.existsSync(absolute)) return [];
	return walkMarkdownFiles(absolute)
		.map((file) => {
			const { data, content } = parseFrontMatter(fs.readFileSync(file, "utf8"));
			const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
			return {
				file: path.relative(root, file).replaceAll("\\", "/"),
				locale,
				title: typeof data.title === "string" ? data.title : "",
				body: content,
				tags,
			};
		})
		.filter((post) => post.tags.includes(subtopicTag));
}

const targets = [
	...collectTargets(path.join("src", "posts", "archright"), "en"),
	...collectTargets(path.join("src", "posts", "ko", "archright"), "ko"),
];

describe("Axiom for External Repos 포스트 형식", () => {
	test("대상 포스트가 두 언어에 존재한다", () => {
		expect(
			targets.filter((post) => post.locale === "en").length,
		).toBeGreaterThanOrEqual(2);
		expect(
			targets.filter((post) => post.locale === "ko").length,
		).toBeGreaterThanOrEqual(2);
	});

	test("모든 대상 포스트가 리포지토리 이름으로 시작하는 제목을 가진다", () => {
		for (const post of targets) {
			expect(post.title, `${post.file}: title`).toMatch(
				/^[a-z0-9][a-z0-9._-]*:\s/,
			);
		}
	});

	test("모든 대상 포스트가 서두에 References/자료 절을 둔다", () => {
		for (const post of targets) {
			const firstHeading = post.body.match(/^##\s+(.+)$/m)?.[1]?.trim();
			expect(firstHeading, `${post.file}: first section`).toBe(
				post.locale === "en" ? "References" : "자료",
			);
		}
	});

	test("모든 대상 포스트가 강조어를 쓰지 않는다", () => {
		for (const post of targets) {
			const pattern =
				post.locale === "en"
					? /\b(real|actually|genuine|decisive)\b/i
					: /실제|진짜/;
			expect(post.body, `${post.file}: emphasis wording`).not.toMatch(pattern);
		}
	});
});
