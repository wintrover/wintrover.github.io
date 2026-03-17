import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	buildDeploymentInputSnapshotLog,
	buildDeploymentInputSnapshotMarkdown,
	buildStatusMarkdown,
	DEPLOY_POSTS_ROOT_RELATIVE,
	discoverPostFiles,
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
			"deploy target discovery is isolated to physical files under content/posts",
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
		expect(workflow).toContain("push:");
		expect(workflow).toContain("branches:");
		expect(workflow).toContain("- deploy");
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain('default: "content/posts"');
		expect(workflow).toContain("ref: deploy");
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

	test("Given LinkedIn 배포 스크립트 When 검사 Then Posts API 스키마와 person URN 검증을 사용한다", () => {
		const script = read("scripts/post-to-dev.ts");
		expect(script).toContain("https://api.linkedin.com/restli/v2/posts");
		expect(script).toContain("https://api.linkedin.com/v2/me");
		expect(script).toContain("commentary:");
		expect(script).toContain('visibility: "PUBLIC"');
		expect(script).toContain("distribution:");
		expect(script).toContain('"LinkedIn-Version"');
	});

	test("Given 배포 스캔 When 기본 탐색 Then content/posts 하위 물리 파일만 수집한다", async () => {
		const postsRoot = path.join(root, DEPLOY_POSTS_ROOT_RELATIVE);
		const insideDir = path.join(postsRoot, "isolation-e2e");
		const insideFile = path.join(insideDir, "inside-post.md");
		const outsideFile = path.join(root, "outside-post.md");
		fs.mkdirSync(insideDir, { recursive: true });
		fs.writeFileSync(insideFile, "# inside");
		fs.writeFileSync(outsideFile, "# outside");
		try {
			const discovered = await discoverPostFiles();
			expect(discovered).toContain(insideFile);
			expect(discovered).not.toContain(outsideFile);
		} finally {
			fs.rmSync(path.join(postsRoot, "isolation-e2e"), {
				recursive: true,
				force: true,
			});
			fs.rmSync(outsideFile, { force: true });
		}
	});

	test("Given 배포 스캔 When content/posts 외부 경로 입력 Then 즉시 거부한다", async () => {
		const outsideFile = path.join(root, "outside-reject.md");
		fs.writeFileSync(outsideFile, "# outside");
		try {
			await expect(discoverPostFiles(outsideFile)).rejects.toThrow(
				"must be inside",
			);
		} finally {
			fs.rmSync(outsideFile, { force: true });
		}
	});

	test("Given 배포 후보 목록 When 스냅샷 생성 Then 기준 루트와 파일 목록이 요약된다", () => {
		const snapshot = buildDeploymentInputSnapshotMarkdown(
			path.join(root, DEPLOY_POSTS_ROOT_RELATIVE),
			[
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "project", "a.md"),
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "company", "b.md"),
			],
		);
		expect(snapshot).toContain("## Deployment Input Snapshot");
		expect(snapshot).toContain("| Scanned Root |");
		expect(snapshot).toContain("content/posts/project/a.md");
		expect(snapshot).toContain("content/posts/company/b.md");
	});

	test("Given 배포 후보 목록 When 로그 스냅샷 생성 Then 터미널 검색 가능한 텍스트로 요약된다", () => {
		const snapshot = buildDeploymentInputSnapshotLog(
			path.join(root, DEPLOY_POSTS_ROOT_RELATIVE),
			[
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "project", "a.md"),
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "company", "b.md"),
			],
		);
		expect(snapshot).toContain("[deploy-input] scanned-root=content/posts");
		expect(snapshot).toContain(
			"[deploy-input] candidate=content/posts/project/a.md",
		);
		expect(snapshot).toContain(
			"[deploy-input] candidate=content/posts/company/b.md",
		);
	});

	test("Given 상태머신 기능 When SSoT 검증 Then CONTEXT 선반영 규칙이 문서에 반영된다", () => {
		expect(context).toContain("Git 파일시스템 상태머신");
		expect(context).toContain(".deploy/lock");
		expect(context).toContain(".deploy/[post-slug]/[platform].status");
		expect(context).toContain("restli/v2/posts");
		expect(context).toContain("v2/me");
		expect(context).toContain("GITHUB_STEP_SUMMARY");
		expect(context).toContain("배포 후보 물리 파일 목록 스냅샷");
		expect(context).toContain("터미널 로그");
		expect(context).toContain("DB 브랜치");
		expect(context).toContain("database");
	});
});
