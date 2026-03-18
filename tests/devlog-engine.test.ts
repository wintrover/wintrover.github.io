import fs from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("Devlog 엔진 중심 아키텍처 검증", () => {
	const feature = read("tests/features/devlog-engine.feature");

	test("Given feature 파일 When 파싱 Then 핵심 시나리오 카탈로그가 유지된다", () => {
		const expected = [
			"state.json defines graph-oriented node and edge schema",
			"devlog CLI exposes sync publish and graph commands",
			"publish requires dependency integrity before transition",
			"publish uses secret-driven mocked platform delivery",
			"GitHub Actions persists engine state changes safely",
		];
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual(expected);
	});

	test("Given state.json When 로딩 Then 그래프 무결성 필드가 존재한다", () => {
		const raw = read("state.json");
		const data = JSON.parse(raw) as {
			version: string;
			nodes: Array<Record<string, unknown>>;
			edges: Array<Record<string, unknown>>;
		};

		expect(data.version).toBeTypeOf("string");
		expect(data.nodes.length).toBeGreaterThan(0);
		expect(data.edges.length).toBeGreaterThanOrEqual(0);

		fc.assert(
			fc.property(fc.constantFrom(...data.nodes), (node) => {
				expect(typeof node.id).toBe("string");
				expect(typeof node.path).toBe("string");
				expect(typeof node.kind).toBe("string");
				expect(typeof node.status).toBe("string");
				expect(node.timestamps).toBeTypeOf("object");
				expect(node.integrity).toBeTypeOf("object");
			}),
		);

		fc.assert(
			fc.property(fc.constantFrom(...data.edges), (edge) => {
				expect(typeof edge.from).toBe("string");
				expect(typeof edge.to).toBe("string");
				expect(typeof edge.relation).toBe("string");
				expect(typeof edge.status).toBe("string");
			}),
		);
	});

	test("Given Nim 엔진 When 코드 검증 Then 필수 명령 인터페이스를 노출한다", () => {
		const engine = read("engine/devlog.nim");
		expect(engine).toContain('command == "sync"');
		expect(engine).toContain('command == "publish"');
		expect(engine).toContain('command == "graph"');
		expect(engine).toContain("checkPublishDependencies");
		expect(engine).toContain("buildGraphPayload");
		expect(engine).toContain("X_API_KEY");
		expect(engine).toContain("LINKEDIN_ACCESS_TOKEN");
		expect(engine).toContain("DEVTO_API_KEY");
		expect(engine).toContain("mock_success");
		expect(engine).toContain("already_published");
		expect(engine).toContain('"api_called": false');
		expect(
			engine.indexOf(
				'if node.getOrDefault("status").getStr("") == "published"',
			),
		).toBeGreaterThan(0);
		expect(
			engine.indexOf(
				'if node.getOrDefault("status").getStr("") == "published"',
			),
		).toBeLessThan(
			engine.indexOf("let delivery = buildMockDelivery(platform)"),
		);
	});

	test("Given Actions 브리지 When 워크플로 검증 Then 상태 영속 커밋과 루프 방지 규칙을 포함한다", () => {
		const workflow = read(".github/workflows/devlog-bridge.yml");
		const gitignore = read(".gitignore");
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain("command:");
		expect(workflow).toContain("node_id:");
		expect(workflow).toContain("nim c -r engine/devlog.nim");
		expect(workflow).toContain("GITHUB_STEP_SUMMARY");
		expect(workflow).toContain("git commit -m");
		expect(workflow).toContain("[skip ci]");
		expect(workflow).toContain("git push origin HEAD:main");
		expect(workflow).toContain("X_API_KEY: ${{ secrets.X_API_KEY }}");
		expect(workflow).toContain(
			"LINKEDIN_ACCESS_TOKEN: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}",
		);
		expect(workflow).toContain("DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}");
		expect(gitignore).not.toContain("state.json");
	});
});
