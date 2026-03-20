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
	isLinkedInDryRunEnabled,
	resolveCanonicalSlug,
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
			"deploy target discovery is isolated to physical files under src/posts",
			"preflight and publish are separated with environment approval",
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
				postKey: "src/posts/project/sample-post",
				platform: "devto",
				state: "success",
				updatedAt: "2026-03-17T00:00:00.000Z",
				detail: "ok",
				postPath: "src/posts/sample-post.md",
			},
			{
				slug: "sample-post",
				postKey: "src/posts/project/sample-post",
				platform: "linkedin",
				state: "failed",
				updatedAt: "2026-03-17T00:00:01.000Z",
				detail: "bad request",
				postPath: "src/posts/sample-post.md",
			},
		]);
		expect(markdown).toContain("# SNS Deployment Status");
		expect(markdown).toContain(
			"| src/posts/project/sample-post | ✅ success | ❌ failed |",
		);
	});

	test("Given workflow 파일 When 검사 Then 상태 파일 커밋과 시크릿 주입을 포함한다", () => {
		const workflow = read(".github/workflows/sns-deploy.yml");
		expect(workflow).toContain("push:");
		expect(workflow).toContain("branches:");
		expect(workflow).toContain("- deploy");
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain("preflight:");
		expect(workflow).toContain("publish:");
		expect(workflow).toContain("notify-on-failure:");
		expect(workflow).toContain("environment: sns-publish");
		expect(workflow).toContain("ref: deploy");
		expect(workflow).toContain("path: database");
		expect(workflow).toContain("ref: DB");
		expect(workflow).toContain("bun scripts/post-to-dev.ts");
		expect(workflow).toContain("DEPLOY_TARGET:");
		expect(workflow).toContain('DEPLOY_PREFLIGHT_ONLY: "true"');
		expect(workflow).toContain("MAX_PUBLISH_PER_RUN:");
		expect(workflow).toContain("linkedin_dry_run:");
		expect(workflow).toContain(
			"github.event.inputs.platforms || 'devto,linkedin'",
		);
		expect(workflow).toContain(
			"github.event.inputs.linkedin_dry_run || 'false'",
		);
		expect(workflow).toContain(
			'run: bun scripts/post-to-dev.ts "${DEPLOY_TARGET}" "${DEPLOY_PLATFORMS}"',
		);
		expect(workflow).toContain("STATE_DATA_ROOT: ./database");
		expect(workflow).toContain(
			"LINKEDIN_DRY_RUN: ${{ needs.preflight.outputs.linkedin_dry_run }}",
		);
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
		expect(workflow).toContain("git --no-pager add .deploy STATUS.md");
		expect(workflow).toContain("git --no-pager checkout --orphan DB");
		expect(workflow).toContain("git --no-pager pull --rebase origin DB");
		expect(workflow).toContain("git --no-pager push origin HEAD:DB");
		expect(workflow).toContain("Notify Slack on failure");
		expect(workflow).toContain("needs.preflight.result");
		expect(workflow).toContain("needs.publish.result");
	});

	test("Given bulk backfill workflow 파일 When 검사 Then 수동 승인과 배치 제한을 포함한다", () => {
		const workflow = read(".github/workflows/sns-bulk-backfill.yml");
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain("targets:");
		expect(workflow).toContain("batch_size:");
		expect(workflow).toContain("environment: sns-bulk-backfill");
		expect(workflow).toContain("Target count");
		expect(workflow).toContain("bun scripts/post-to-dev.ts");
	});

	test("Given LinkedIn 배포 스크립트 When 검사 Then Posts API 스키마와 person URN 검증을 사용한다", () => {
		const script = read("scripts/post-to-dev.ts");
		expect(script).toContain("https://api.linkedin.com/rest/posts");
		expect(script).toContain("https://api.linkedin.com/v2/me");
		expect(script).toContain("commentary:");
		expect(script).toContain('visibility: "PUBLIC"');
		expect(script).toContain("distribution:");
		expect(script).toContain('"LinkedIn-Version"');
		expect(script).toContain('"Linkedin-Version"');
		expect(script).toContain("fallback URN is used");
		expect(script).toContain("normalizeLinkedInVersion(");
		expect(script).toContain("normalizeLinkedInPostsApiUrl(");
		expect(script).toContain("NONEXISTENT_VERSION");
		expect(script).toContain("publishRequest(");
		expect(script).toContain("buildLinkedInCommentary(");
		expect(script).toContain("resolveEnglishLinkedInIntro(");
		expect(script).toContain("linkedInIntro:");
		expect(script).toContain('join("\\n\\n")');
		expect(script).toContain("buildLinkedInDryRunPreview(");
		expect(script).toContain("LINKEDIN_DRY_RUN");
		expect(script).toContain("[linkedin-dry-run] payload=");
		expect(script).toContain("hasHangul(");
		expect(script).toContain(
			"I shared a new post about engineering decisions and quality automation. Read it here.",
		);
		expect(script).toContain("trimmed.slice(0, 6)");
	});

	test("Given dry-run 입력값 When 플래그 해석 Then truthy 문자열만 활성화된다", () => {
		expect(isLinkedInDryRunEnabled("true")).toBe(true);
		expect(isLinkedInDryRunEnabled(" 1 ")).toBe(true);
		expect(isLinkedInDryRunEnabled("yes")).toBe(true);
		expect(isLinkedInDryRunEnabled("on")).toBe(true);
		expect(isLinkedInDryRunEnabled("false")).toBe(false);
		expect(isLinkedInDryRunEnabled("0")).toBe(false);
		expect(isLinkedInDryRunEnabled("")).toBe(false);
		expect(isLinkedInDryRunEnabled(undefined)).toBe(false);
	});

	test("Given 배포 스캔 When target 누락 Then 즉시 거부한다", async () => {
		await expect(discoverPostFiles()).rejects.toThrow("target is required");
	});

	test("Given 배포 스캔 When 디렉토리 target 입력 Then 즉시 거부한다", async () => {
		const postsRoot = path.join(root, DEPLOY_POSTS_ROOT_RELATIVE);
		const insideDir = path.join(postsRoot, "isolation-e2e");
		const insideFile = path.join(insideDir, "inside-post.md");
		fs.mkdirSync(insideDir, { recursive: true });
		fs.writeFileSync(insideFile, "# inside");
		try {
			await expect(discoverPostFiles(insideDir)).rejects.toThrow(
				"must be a markdown file",
			);
		} finally {
			fs.rmSync(path.join(postsRoot, "isolation-e2e"), {
				recursive: true,
				force: true,
			});
		}
	});

	test("Given 배포 스캔 When ko 경로 파일 입력 Then 즉시 거부한다", async () => {
		const postsRoot = path.join(root, DEPLOY_POSTS_ROOT_RELATIVE);
		const koDir = path.join(postsRoot, "ko", "project");
		const koFile = path.join(koDir, "ko-exclusion-e2e.md");
		fs.mkdirSync(koDir, { recursive: true });
		fs.writeFileSync(koFile, "# ko exclusion");
		try {
			await expect(discoverPostFiles(koFile)).rejects.toThrow("must exclude");
		} finally {
			fs.rmSync(koFile, { force: true });
		}
	});

	test("Given 배포 스캔 When src/posts/ko 내부 경로 입력 Then 즉시 거부한다", async () => {
		const koTarget = path.join(
			root,
			DEPLOY_POSTS_ROOT_RELATIVE,
			"ko",
			"project",
			"2025-06-25-1.md",
		);
		await expect(discoverPostFiles(koTarget)).rejects.toThrow("must exclude");
	});

	test("Given 배포 스캔 When src/posts 외부 경로 입력 Then 즉시 거부한다", async () => {
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

	test("Given 배포 스캔 When src/posts 내부 md 파일 입력 Then 단일 후보를 반환한다", async () => {
		const postsRoot = path.join(root, DEPLOY_POSTS_ROOT_RELATIVE);
		const file = path.join(postsRoot, "project", "single-target-e2e.md");
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, "# single");
		try {
			const discovered = await discoverPostFiles(file);
			expect(discovered).toEqual([file]);
		} finally {
			fs.rmSync(file, { force: true });
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
		expect(snapshot).toContain("src/posts/project/a.md");
		expect(snapshot).toContain("src/posts/company/b.md");
	});

	test("Given 배포 후보 목록 When 로그 스냅샷 생성 Then 터미널 검색 가능한 텍스트로 요약된다", () => {
		const snapshot = buildDeploymentInputSnapshotLog(
			path.join(root, DEPLOY_POSTS_ROOT_RELATIVE),
			[
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "project", "a.md"),
				path.join(root, DEPLOY_POSTS_ROOT_RELATIVE, "company", "b.md"),
			],
		);
		expect(snapshot).toContain("[deploy-input] scanned-root=src/posts");
		expect(snapshot).toContain(
			"[deploy-input] candidate=src/posts/project/a.md",
		);
		expect(snapshot).toContain(
			"[deploy-input] candidate=src/posts/company/b.md",
		);
	});

	test("Given canonical slug 생성 When 제목에 apostrophe 포함 Then 앱 라우팅 slug와 동일해야 한다", () => {
		const slug = resolveCanonicalSlug(
			path.join(
				root,
				DEPLOY_POSTS_ROOT_RELATIVE,
				"project",
				"2026-03-19-20.md",
			),
			"Why We Still Don't Trust AI-Generated Code: The Archright Trinity",
		);
		expect(slug).toBe(
			"why-we-still-don-t-trust-ai-generated-code-the-archright-trinity",
		);
	});

	test("Given 상태머신 기능 When SSoT 검증 Then CONTEXT 선반영 규칙이 문서에 반영된다", () => {
		expect(context).toContain("Git 파일시스템 상태머신");
		expect(context).toContain(".deploy/lock");
		expect(context).toContain(".deploy/[post-key]/[platform].status");
		expect(context).toContain("rest/posts");
		expect(context).toContain("v2/me");
		expect(context).toContain("GITHUB_STEP_SUMMARY");
		expect(context).toContain("배포 후보 물리 파일 목록 스냅샷");
		expect(context).toContain("터미널 로그");
		expect(context).toContain("DB 브랜치");
		expect(context).toContain("database");
		expect(context).toContain("MAX_PUBLISH_PER_RUN");
		expect(context).toContain("linkedin_dry_run=true");
		expect(context).toContain("bulk-backfill");
	});
});
