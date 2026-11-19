import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	buildLegacyLocaleAlias,
	buildLegacyPostAliases,
	LEGACY_POST_ALIASES,
	renderLegacyLocaleAliasHtml,
	renderLegacyPostAliasHtml,
	validatePostCategoryTagConsistency,
} from "../scripts/build-github";

let tempRoot: string;

beforeEach(() => {
	tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-github-"));
	fs.mkdirSync(path.join(tempRoot, "src", "lib"), { recursive: true });
	fs.copyFileSync(
		path.resolve("src/lib/categories.json"),
		path.join(tempRoot, "src", "lib", "categories.json"),
	);
});

afterEach(() => {
	fs.rmSync(tempRoot, { recursive: true, force: true });
	vi.restoreAllMocks();
});

function writePost(relativePath: string, content: string) {
	const filePath = path.join(tempRoot, "src", "posts", relativePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content);
}

describe("build-github category/tag consistency", () => {
	test("Axiom 태그 + Archright 카테고리는 통과한다", () => {
		writePost(
			"archright/temp-test-valid.md",
			"---\ncategory: Archright\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		validatePostCategoryTagConsistency(tempRoot);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("Axiom 태그 + Project 카테고리는 빌드 실패한다", () => {
		writePost(
			"project/temp-test-invalid.md",
			"---\ncategory: Project\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		expect(() => validatePostCategoryTagConsistency(tempRoot)).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github legacy locale alias", () => {
	test("/kr alias는 canonical /ko/와 0초 meta refresh를 가진다", () => {
		buildLegacyLocaleAlias(tempRoot);
		const html = fs.readFileSync(
			path.join(tempRoot, "kr", "index.html"),
			"utf-8",
		);
		expect(html).toContain(
			'rel="canonical" href="https://wintrover.github.io/ko/"',
		);
		expect(html).toContain('http-equiv="refresh" content="0; url=/ko/"');
		expect(html).toContain('<noscript><a href="/ko/">');
		expect(html).toContain('<html lang="ko">');
		expect(html).not.toContain("noindex");
	});

	test("renderLegacyLocaleAliasHtml는 독립 HTML 문서를 반환한다", () => {
		const html = renderLegacyLocaleAliasHtml();
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('rel="canonical"');
		expect(html).toContain('http-equiv="refresh"');
	});
});

describe("build-github legacy post alias", () => {
	const alias = LEGACY_POST_ALIASES[0];
	const post = {
		title:
			"The Agent Wrote the Theorem: A Model-Level Disproof, a Pipeline Gap, and a Refusal to Cheat",
		description: "This post moved to a new URL.",
	};
	const targetPath =
		"https://wintrover.github.io/post/the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat/";

	test("LEGACY_POST_ALIASES는 옛 slug를 현재 slug로 매핑한다", () => {
		expect(alias).toEqual({
			from: "the-agent-wrote-the-theorem-a-formal-disproof-a-pipeline-gap-and-a-refusal-to-cheat",
			to: "the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat",
		});
	});

	test("renderLegacyPostAliasHtml는 영어 canonical과 noindex meta refresh를 가진다", () => {
		const html = renderLegacyPostAliasHtml(alias, post);
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain(`rel="canonical" href="${targetPath}"`);
		expect(html).toContain('<meta name="robots" content="noindex,follow"/>');
		expect(html).toContain(
			'http-equiv="refresh" content="0; url=/#/post/the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat"',
		);
		expect(html).toContain(`<meta property="og:url" content="${targetPath}"`);
		expect(html).toContain(
			'<meta property="og:image" content="https://wintrover.github.io/images/profile.png"/>',
		);
		expect(html).toContain('<meta property="og:site_name" content="Axiom"/>');
	});

	test("buildLegacyPostAliases는 영어 트리에만 별칭을 생성한다", () => {
		buildLegacyPostAliases(tempRoot);
		expect(
			fs.existsSync(path.join(tempRoot, "post", alias.from, "index.html")),
		).toBe(true);
		expect(fs.existsSync(path.join(tempRoot, "ko", "post", alias.from))).toBe(
			false,
		);
	});
});
