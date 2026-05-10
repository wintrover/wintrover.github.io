import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validatePostCategoryTagConsistency } from "../scripts/build-github";

function cleanupTempFiles() {
	const dirs = ["src/posts", "src/posts/ko"];
	for (const dir of dirs) {
		if (!fs.existsSync(dir)) continue;
		const stack: string[] = [dir];
		while (stack.length > 0) {
			const current = stack.pop() as string;
			const entries = fs.readdirSync(current, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					stack.push(fullPath);
					continue;
				}
				if (
					entry.isFile() &&
					entry.name.startsWith("temp-") &&
					entry.name.endsWith(".md")
				) {
					fs.unlinkSync(fullPath);
				}
			}
		}
	}
}

describe("build-github category/tag consistency", () => {
	beforeEach(cleanupTempFiles);
	afterEach(cleanupTempFiles);

	test("Axiom 태그 + Archright 카테고리는 통과한다", () => {
		const tempDir = "src/posts/archright";
		const tempFile = path.join(tempDir, "temp-test-valid.md");
		fs.mkdirSync(tempDir, { recursive: true });
		fs.writeFileSync(
			tempFile,
			"---\ncategory: Archright\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		validatePostCategoryTagConsistency(process.cwd());
		expect(exitSpy).not.toHaveBeenCalled();
		exitSpy.mockRestore();
		fs.unlinkSync(tempFile);
	});

	test("Axiom 태그 + Project 카테고리는 빌드 실패한다", () => {
		const tempDir = "src/posts/project";
		const tempFile = path.join(tempDir, "temp-test-invalid.md");
		fs.mkdirSync(tempDir, { recursive: true });
		fs.writeFileSync(
			tempFile,
			"---\ncategory: Project\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		expect(() => validatePostCategoryTagConsistency(process.cwd())).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
		fs.unlinkSync(tempFile);
	});
});
