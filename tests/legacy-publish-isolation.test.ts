import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runDeployment } from "../scripts/post-to-dev";

const root = process.cwd();
const workflowDir = path.join(root, ".github/workflows");
const featurePath = path.join(
	root,
	"tests/features/legacy-publish-isolation.feature",
);

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

function workflows(): Array<{ name: string; content: string }> {
	return fs
		.readdirSync(workflowDir)
		.filter((name) => name.endsWith(".yml"))
		.map((name) => ({
			name,
			content: fs.readFileSync(path.join(workflowDir, name), "utf-8"),
		}));
}

describe("Legacy publish path isolation", () => {
	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [
			...fs
				.readFileSync(featurePath, "utf-8")
				.matchAll(/^\s*Scenario:\s*(.+)$/gm),
		].map((match) => match[1].trim());
		expect(scenarios).toEqual([
			"Legacy publish and bridge workflows are removed",
			"Only approved draft workflows can read the DEV.to credential",
			"Legacy CLI requires explicit opt-in",
		]);
	});

	test("Given 워크플로 카탈로그 When 검사 Then 레거시 발행 경로가 존재하지 않는다", () => {
		const names = workflows().map((workflow) => workflow.name);
		expect(names).not.toContain("sns-deploy.yml");
		expect(names).not.toContain("sns-bulk-backfill.yml");
		expect(names).not.toContain("devlog-bridge.yml");
	});

	test("Given 모든 워크플로 When 검사 Then main 직접 push 경로가 없다", () => {
		for (const workflow of workflows()) {
			expect(workflow.content).not.toContain("git push origin HEAD:main");
			expect(workflow.content).not.toContain(
				"git push origin HEAD:main --force",
			);
		}
	});

	test("Given 워크플로 When DEVTO_API_KEY 참조를 열거 Then 승인된 두 경로만 남는다", () => {
		const referencing = workflows()
			.filter((workflow) => workflow.content.includes("secrets.DEVTO_API_KEY"))
			.map((workflow) => workflow.name)
			.sort();
		expect(referencing).toEqual(["publish-one.yml", "unpublish-one.yml"]);
		for (const workflow of workflows().filter((entry) =>
			referencing.includes(entry.name),
		)) {
			expect(workflow.content).toContain("environment: sns-publish");
		}
	});

	test("Given Draft One When 트리거 검사 Then repository_dispatch만 허용한다", () => {
		const publishOne = read(".github/workflows/publish-one.yml");
		expect(publishOne).toContain("repository_dispatch:");
		expect(publishOne).toContain("types: [draft-one]");
		expect(publishOne).not.toContain("workflow_dispatch:");
		expect(publishOne).toContain("environment: sns-publish");
	});

	test("Given 레거시 CLI When PUBLISH_LEGACY_ENABLED 미설정 Then 네트워크 호출 전에 거부한다", async () => {
		const previous = process.env.PUBLISH_LEGACY_ENABLED;
		delete process.env.PUBLISH_LEGACY_ENABLED;
		try {
			await expect(runDeployment()).rejects.toThrow(
				/Legacy publish path is disabled/,
			);
		} finally {
			if (previous === undefined) {
				delete process.env.PUBLISH_LEGACY_ENABLED;
			} else {
				process.env.PUBLISH_LEGACY_ENABLED = previous;
			}
		}
	});
});

afterEach(() => {
	delete process.env.PUBLISH_LEGACY_ENABLED;
});
