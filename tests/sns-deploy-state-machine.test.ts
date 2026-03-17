import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	buildStatusMarkdown,
	evaluateDeploymentDecision,
} from "../scripts/post-to-dev";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("SNS 배포 상태 머신 검증", () => {
	const feature = read("tests/features/sns-deploy-state-machine.feature");
	const context = read("CONTEXT.md");

	test("Given feature 파일 When 파싱 Then 핵심 시나리오가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"soft lock prevents duplicate execution",
			"per-platform state file decides retry and skip behavior",
			"platform APIs are called with required identity and absolute image URLs",
			"action persists deploy state to isolated DB branch",
			"state persistence push handles conflict with bounded rebase retries",
		]);
	});

	test("Given 상태 파일 존재 여부 When 의사결정 Then 멱등성 규칙이 적용된다", () => {
		expect(evaluateDeploymentDecision(true, true)).toBe("skip");
		expect(evaluateDeploymentDecision(false, true)).toBe("attempt");
		expect(evaluateDeploymentDecision(false, false)).toBe("attempt");
	});

	test("Given 플랫폼 상태 목록 When STATUS.md 생성 Then 마크다운 표가 렌더링된다", () => {
		const markdown = buildStatusMarkdown([
			{
				slug: "sample-post",
				platform: "devto",
				state: "success",
				updatedAt: "2026-03-17T00:00:00.000Z",
				detail: "ok",
				postPath: "src/posts/sample-post.md",
			},
			{
				slug: "sample-post",
				platform: "linkedin",
				state: "failed",
				updatedAt: "2026-03-17T00:00:01.000Z",
				detail: "bad request",
				postPath: "src/posts/sample-post.md",
			},
		]);
		expect(markdown).toContain("# SNS Deployment Status");
		expect(markdown).toContain("| sample-post | ✅ success | ❌ failed |");
	});

	test("Given workflow 파일 When 검사 Then 상태 파일 커밋과 시크릿 주입을 포함한다", () => {
		const workflow = read(".github/workflows/sns-deploy.yml");
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain("path: database");
		expect(workflow).toContain("ref: DB");
		expect(workflow).toContain("bun scripts/post-to-dev.ts");
		expect(workflow).toContain("STATE_DATA_ROOT: ./database");
		expect(workflow).toContain(
			"LINKEDIN_ACCESS_TOKEN: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}",
		);
		expect(workflow).toContain(
			"LINKEDIN_PERSON_URN: ${{ secrets.LINKEDIN_PERSON_URN }}",
		);
		expect(workflow).toContain("DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}");
		expect(workflow).toContain("cp -R .deploy/. database/.deploy/");
		expect(workflow).toContain("cp STATUS.md database/STATUS.md");
		expect(workflow).toContain("cd database");
		expect(workflow).toContain("git add .deploy STATUS.md");
		expect(workflow).toContain("git checkout --orphan DB");
		expect(workflow).toContain("git pull --rebase origin DB");
		expect(workflow).toContain("git push origin HEAD:DB");
	});

	test("Given 상태머신 기능 When SSoT 검증 Then CONTEXT 선반영 규칙이 문서에 반영된다", () => {
		expect(context).toContain("Git 파일시스템 상태머신");
		expect(context).toContain(".deploy/lock");
		expect(context).toContain(".deploy/[post-slug]/[platform].status");
		expect(context).toContain("GITHUB_STEP_SUMMARY");
		expect(context).toContain("DB 브랜치");
		expect(context).toContain("database");
	});
});
