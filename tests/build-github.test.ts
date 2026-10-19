import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validatePostCategoryTagConsistency } from "../scripts/build-github";

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
