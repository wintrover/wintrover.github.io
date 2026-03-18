import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { evaluateProcedureGate } from "../scripts/procedure-gate";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("절차 게이트 강제 검증", () => {
	const feature = read("tests/features/procedure-gate.feature");

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 유지된다", () => {
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual([
			"implementation change requires context bdd and test evidence",
			"documentation-only change should not be blocked",
			"CI gate must run on pull_request and push",
		]);
	});

	test("Given 구현 변경 When 근거 파일 누락 Then 게이트가 실패한다", () => {
		const result = evaluateProcedureGate(["scripts/post-to-dev.ts"]);
		expect(result.ok).toBe(false);
		expect(result.missing).toContain("CONTEXT.md");
		expect(result.missing).toContain("tests/features/*.feature");
		expect(result.missing).toContain("tests/**/*.test.ts");
	});

	test("Given 구현 변경과 근거 파일 포함 When 판정 Then 게이트가 통과한다", () => {
		const result = evaluateProcedureGate([
			"scripts/post-to-dev.ts",
			"CONTEXT.md",
			"tests/features/sns-deploy-state-machine.feature",
			"tests/sns-deploy-state-machine.test.ts",
		]);
		expect(result.ok).toBe(true);
		expect(result.missing).toHaveLength(0);
	});

	test("Given 문서만 변경 When 판정 Then 게이트가 통과한다", () => {
		const result = evaluateProcedureGate(["docs/DEVTO_PUBLISH_RUNBOOK.md"]);
		expect(result.ok).toBe(true);
		expect(result.missing).toHaveLength(0);
	});

	test("Given workflow 파일 When 검사 Then 절차 게이트가 PR과 push에서 실행된다", () => {
		const workflow = read(".github/workflows/procedure-gate.yml");
		expect(workflow).toContain("pull_request:");
		expect(workflow).toContain("push:");
		expect(workflow).toContain("pnpm run gate:procedure:ci");
	});
});
