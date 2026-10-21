// AGENTS.md 헌법 분할 계약 테스트 - constitution split을 기계적으로 고정한다
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

const AGENT_DOCS = [
	"docs/agents/operations.md",
	"docs/agents/task-process.md",
	"docs/agents/quality-gates.md",
];

const CODEOWNER_PATHS = [
	"/AGENTS.md",
	"/CONTEXT.md",
	"/docs/agents/",
	"/.pre-commit-config.yaml",
	"/package.json",
	"/vite.config.ts",
	"/pnpm-lock.yaml",
	"/tests/agents-constitution.test.ts",
	"/skills/",
];

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

function exists(rel: string) {
	return fs.existsSync(path.join(root, rel));
}

function countLines(content: string) {
	return content.split("\n").length;
}

function frontmatterBody(content: string) {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
	return match ? match[1] : content;
}

function skillDirectories() {
	return fs
		.readdirSync(path.join(root, "skills"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

describe("에이전트 헌법 분할 계약", () => {
	const feature = read("tests/features/agents-constitution.feature");

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"constitution keeps only fact invariant authority acceptance statements",
			"detailed procedure documents exist and are referenced one way",
			"moved procedure and tool content cannot reappear in AGENTS.md",
			"skills are discovery pointers and not a second source of truth",
			"codeowners declares the control plane paths",
			"retired procedure gate workflow is absent",
		]);
	});

	test("Given feature 파일 When 구조 검증 Then 각 시나리오는 Given/When/Then 흐름을 가진다", () => {
		const blocks = feature
			.split(/\r?\n(?=\s*Scenario:)/)
			.filter((block) => block.includes("Scenario:"));
		for (const block of blocks) {
			expect(block).toContain("Given ");
			expect(block).toContain("When ");
			expect(block).toContain("Then ");
		}
	});

	test("Given AGENTS.md When 헌법 헤더를 확인 Then 잔류 기준이 선언되어 있다", () => {
		const agents = read("AGENTS.md");
		expect(agents).toContain("이 파일이 정의하는 것");
		expect(agents).toContain(
			"Fact · Invariant · Authority · Acceptance/Failure",
		);
		expect(agents).toContain("Procedure");
		expect(agents).toContain("Tool");
		expect(agents).toContain("Checklist");
		expect(agents).toContain("Rationale");
		expect(agents).toContain("Example");
		expect(agents).toContain("docs/agents/");
	});

	test("Given AGENTS.md When 절차 문서 참조를 확인 Then 단방향 안내가 존재한다", () => {
		const agents = read("AGENTS.md");
		for (const doc of AGENT_DOCS) {
			expect(agents).toContain(doc);
		}
	});

	test("Given AGENTS.md When 이동된 절차를 확인 Then 절차·도구 내용이 남아 있지 않다", () => {
		const agents = read("AGENTS.md");
		expect(agents).not.toContain("### 도구 사용 강제");
		expect(agents).not.toContain("### 핵심 가동 지침");
		expect(agents).not.toContain("### 표준 언어 및 환경");
		expect(agents).not.toContain("에이전트 운영 및 도구 사용 규정");
		expect(agents).not.toContain("작업 프로세스 및 스킬 매핑");
		expect(agents).not.toContain("Quick Recap");
		expect(agents).not.toContain("주요 설정 및 명령어");
		expect(agents).not.toContain("예외 및 품질 게이트");
		expect(agents).not.toContain("mcp_code-index_*");
		expect(agents).not.toContain("mcp_Sequential_Thinking_sequentialthinking");
		expect(agents).not.toContain("mcp_Chrome_DevTools_MCP_*");
		expect(agents).not.toContain("ctx7 library");
	});

	test("Given docs/agents When 절차 문서를 확인 Then 세 문서가 존재하고 비어 있지 않다", () => {
		for (const doc of AGENT_DOCS) {
			expect(exists(doc)).toBe(true);
			expect(countLines(read(doc))).toBeGreaterThan(20);
		}
	});

	test("Given docs/agents When 이동된 내용을 확인 Then 절차 본문이 해당 문서에 남아 있다", () => {
		const operations = read("docs/agents/operations.md");
		expect(operations).toContain("code-index");
		expect(operations).toContain("Sequential Thinking");
		expect(operations).toContain("Chrome DevTools");
		expect(operations).toContain("src/lib/log.ts");
		expect(operations).toContain("`any`");

		const taskProcess = read("docs/agents/task-process.md");
		expect(taskProcess).toContain("fast-check");
		expect(taskProcess).toContain("부작용 가설");
		expect(taskProcess).toContain("UI Motion Rule");

		const qualityGates = read("docs/agents/quality-gates.md");
		expect(qualityGates).toContain("prek");
		expect(qualityGates).toContain("validate.yml");
		expect(qualityGates).toContain("2026-10-19");
		expect(qualityGates).toContain("procedure-gate");
	});

	test("Given skills When 포인터를 확인 Then 절차 SSOT를 가리키는 얇은 포인터만 남는다", () => {
		const directories = skillDirectories();
		expect(directories.length).toBeGreaterThan(0);
		for (const directory of directories) {
			const rel = `skills/${directory}/SKILL.md`;
			const content = read(rel);
			expect(content).toContain("name:");
			expect(content).toContain("description:");
			const body = frontmatterBody(content);
			expect(body).toContain("docs/agents/");
			expect(countLines(body.trim())).toBeLessThanOrEqual(25);
			expect(body).not.toContain("## Rules");
			expect(body).not.toContain("## Checklist");
		}
	});

	test("Given CODEOWNERS When 통제 경로를 확인 Then 선언된 경로가 모두 소유자를 가진다", () => {
		const codeowners = read(".github/CODEOWNERS");
		const lines = codeowners
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && !line.startsWith("#"));
		for (const ownerPath of CODEOWNER_PATHS) {
			const line = lines.find((candidate) => candidate.startsWith(ownerPath));
			expect(line, `CODEOWNERS 누락: ${ownerPath}`).toBeDefined();
			expect(line?.endsWith("@wintrover")).toBe(true);
		}
	});

	test("Given CODEOWNERS When 기존 소유 경로를 확인 Then 회귀 없이 유지된다", () => {
		const codeowners = read(".github/CODEOWNERS");
		for (const ownerPath of [
			"/.github/workflows/",
			"/.github/CODEOWNERS",
			"/scripts/post-to-dev.ts",
			"/scripts/procedure-gate.ts",
			"/tests/devto-publish-one.test.ts",
			"/tests/legacy-publish-isolation.test.ts",
		]) {
			expect(codeowners).toContain(ownerPath);
		}
	});

	test("Given 은퇴한 절차 게이트 When 워크플로 디렉터리를 확인 Then 워크플로가 존재하지 않는다", () => {
		expect(exists(".github/workflows/procedure-gate.yml")).toBe(false);
	});
});
