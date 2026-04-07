import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { syncEnglishContentForSlug } from "../scripts/sync-post-localization";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("post localization auto sync", () => {
	test("Given KO formal-verification anchors When syncing same slug Then EN section is automatically patched", () => {
		const koPath = "src/posts/ko/archright/2026-03-19-20.md";
		const ko = read(koPath);
		const enAfterSectionTrim = read(
			"src/posts/archright/2026-03-19-20.md",
		).replace(
			/\nThis verification is not a post-hoc review\.[\s\S]*?We create a state where bugs cannot exist\.\n/m,
			"\n",
		);
		const en = enAfterSectionTrim
			.replace(
				/\nThis system is not a simple log\.[\s\S]*?In short, code is only one output that must satisfy this intent\.\n/m,
				"\n",
			)
			.replace(
				/\nLanguage choice is not a matter of taste\.[\s\S]*?Intent and constraints are verified first, before they are converted into code\.\n/m,
				"\n",
			)
			.replace(
				/\nAI writes code\.\\\nArchright creates a state where that code cannot be wrong\.\n/m,
				"\n",
			);

		const result = syncEnglishContentForSlug(koPath, ko, en);

		expect(result.changed).toBe(true);
		expect(result.reason).toBe("patched");
		expect(result.content).toContain(
			"This verification is not a post-hoc review.\\",
		);
		expect(result.content).toContain("For example:\\");
		expect(result.content).toContain(
			"If a request is sent with another user's ID:\\",
		);
		expect(result.content).toContain("This system is not a simple log.\\");
		expect(result.content).toContain("Requirements input\\");
		expect(result.content).toContain(
			"Intent (high level) → Constraints (intermediate form) → Code (low level)\\",
		);
		expect(result.content).toContain("AI writes code.\\");
		expect(result.content).toContain(
			"Archright creates a state where that code cannot be wrong.",
		);
		expect(result.content).toContain(
			"→ it is immediately detected as a counterexample and code generation is stopped.\\",
		);
		expect(result.content).toContain(
			"→ if even one violating case exists, that logic is not generated.",
		);
	});

	test("Given KO anchors missing When syncing Then EN content remains unchanged", () => {
		const koPath = "src/posts/ko/archright/2026-03-19-20.md";
		const ko = read(koPath).replace(
			"다른 사용자의 ID로 요청을 보내는 경우:\\",
			"다른 사용자 식별자로 요청을 보내는 경우:\\",
		);
		const en = read("src/posts/archright/2026-03-19-20.md");

		const result = syncEnglishContentForSlug(koPath, ko, en);

		expect(result.changed).toBe(false);
		expect(result.reason).toBe("ko-anchor-missing");
		expect(result.content).toBe(en);
	});
});
