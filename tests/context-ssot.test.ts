import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("SSoT context 규칙 전수 검증", () => {
	const feature = read("tests/features/context-architecture.feature");
	const context = read("CONTEXT.md");
	const buildScript = read("scripts/build-github.ts");
	const imageTools = read("scripts/image-tools.ts");
	const locale = read("src/lib/locale.ts");
	const config = read("src/lib/config.ts");
	const app = read("src/App.svelte");
	const blogList = read("src/components/BlogList.svelte");
	const homePage = read("src/routes/+page.svelte");
	const postFeed = read("src/components/PostFeed.svelte");
	const postDetail = read("src/components/PostDetail.svelte");

	test("Given CONTEXT When 검토 Then 필수 헌법 규칙이 빠짐없이 존재한다", () => {
		expect(context).toContain("진실의 단일 원천");
		expect(context).toContain("기본 언어는 영어");
		expect(context).toContain("/ko/");
		expect(context).toContain("/en/");
		expect(context).toContain("브랜드 메타데이터");
		expect(context).toContain("build-github.ts");
		expect(context).toContain("image-tools.ts");
		expect(context).toContain("세로 정렬");
		expect(context).toContain("일정한 카드 크기");
		expect(context).toContain("동일한 포스트 리스트 UI 컴포넌트");
		expect(context).toContain("Geist 다크 테마");
		expect(context).toContain("zinc 기반 중성 팔레트");
		expect(context).toContain("시각 밀도");
		expect(context).toContain("수직 리듬 스케일 토큰");
	});

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 SSoT와 일치한다", () => {
		const expected = [
			"CONTEXT 문서가 핵심 헌법 규칙을 포함한다",
			"URL architecture uses root for English and /ko for Korean",
			"Locale detection must not treat /en as locale path",
			"Canonical SEO path must follow locale prefix policy",
			"Brand metadata should be derived from one shared source",
			"Blog list canonical URL must not emit /en fallback",
			"Blog list layout keeps vertical flow and equal card size",
			"Mobile app content fits viewport width without horizontal overflow",
			"All list routes reuse one post list UI source",
			"Post detail page keeps Geist dark visual language",
			"Post route hero motion must replay on route entry",
			"Build output verification enforces deployment entrypoints",
			"Sitemap generation preserves locale architecture",
			"Build and Mermaid pipelines keep critical invariants",
			"Mermaid image naming and fallback handling remain deterministic",
			"Transient post loading failures must be retryable",
		];
		const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+)$/gm)].map(
			(match) => match[1].trim(),
		);
		expect(scenarios).toEqual(expected);
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

	test("Given locale 규칙 When 경로 파싱 Then /ko만 locale 경로로 인식한다", () => {
		expect(locale).toContain("match(/^\\/ko(\\/|$)/)");
		expect(locale).not.toContain("/^\\/en(\\/|$)/");
		expect(locale).toContain(
			'return nav.startsWith("ko") ? "ko" : defaultLocale',
		);
		expect(locale).toContain('return locale === "ko" ? "/ko/" : "/"');
	});

	test("Given post SEO 생성 When locale 적용 Then canonical prefix가 규칙을 따른다", () => {
		expect(config).toContain(
			'const localePrefix = resolvedLocale === "ko" ? "/ko" : ""',
		);
		expect(config).toContain("`${origin}${localePrefix}/post/${slug}/`");
	});

	test("Given 브랜드 메타데이터 When 빌드 설정 검증 Then 단일 원천 함수를 사용한다", () => {
		expect(config).toContain("export function getBlogBuildMeta");
		expect(buildScript).toContain("getBlogBuildMeta");
		expect(buildScript).toContain('from "../src/lib/config"');
	});

	test("Given list routes When UI 구성 검증 Then 단일 PostFeed 컴포넌트를 재사용한다", () => {
		expect(blogList).toContain('import PostFeed from "./PostFeed.svelte"');
		expect(homePage).toContain(
			'import PostFeed from "../components/PostFeed.svelte"',
		);
		expect(app).toContain('"/category/:category": BlogList');
		expect(app).toContain('"/category/:category/tag/:tag": BlogList');
	});

	test("Given PostFeed 스타일 When 카드 레이아웃 검증 Then 세로 흐름과 균일 카드 크기를 유지한다", () => {
		expect(postFeed).toContain(".post-card");
		expect(postFeed).toContain("min-height: 176px");
		expect(postFeed).toContain("display: grid");
		expect(postFeed).toContain("-webkit-line-clamp: 2");
	});

	test("Given 포스트 상세 페이지 When 스타일 검증 Then Geist 다크 토큰을 유지한다", () => {
		expect(postDetail).not.toContain("#0366d6");
		expect(postDetail).not.toContain("#f6f8fa");
		expect(postDetail).not.toContain("#24292e");
		expect(postDetail).toContain("rgb(39 39 42");
		expect(postDetail).toContain("#a1a1aa");
		expect(postDetail).toContain("font-size: clamp(1.75rem, 3.2vw, 2.1rem)");
		expect(postDetail).toContain("--rhythm-type-body: 0.98rem");
		expect(postDetail).toContain("--rhythm-line-body: 1.7");
		expect(postDetail).toContain("line-height: var(--rhythm-line-body)");
	});

	test("Given 리스트와 상세 페이지 When 스타일 검증 Then 수직 리듬 토큰을 공유한다", () => {
		expect(postFeed).toContain("--rhythm-gap-md:");
		expect(postFeed).toContain("--rhythm-type-body:");
		expect(postDetail).toContain("--rhythm-gap-md:");
		expect(postDetail).toContain("--rhythm-type-body:");
		expect(postFeed).toContain("gap: var(--rhythm-gap-md)");
		expect(postDetail).toContain("font-size: var(--rhythm-type-body)");
	});

	test("Given build-github.ts When output 검증 Then 필수 entrypoint를 강제한다", () => {
		expect(buildScript).toContain('path.join(distPath, "index.html")');
		expect(buildScript).toContain('path.join(distPath, "ko", "index.html")');
		expect(buildScript).toContain(
			'path.join(distPath, "resume", "index.html")',
		);
		expect(buildScript).toContain(
			'path.join(distPath, "ko", "resume", "index.html")',
		);
		expect(buildScript).not.toContain(
			'path.join(distPath, "en", "index.html")',
		);
		expect(buildScript).toContain("process.exit(1)");
	});

	test("Given build-github.ts When sitemap 생성 Then locale URL 구조를 보존한다", () => {
		expect(buildScript).toContain(
			'const localePrefix = locale === "ko" ? "/ko" : ""',
		);
		expect(buildScript).toContain(
			"`${base}${localePrefix}/post/${post.slug}/`",
		);
		expect(buildScript).not.toContain("`${base}/en/post/");
	});

	test("Given image-tools.ts When Mermaid 처리 검증 Then 추출-렌더-치환-폴백을 유지한다", () => {
		expect(imageTools).toContain("export function extractMermaidBlocks");
		expect(imageTools).toContain(
			"export async function processMermaidDiagrams",
		);
		expect(imageTools).toContain("await convertMermaidToImage");
		expect(imageTools).toContain(
			"const imageMarkdown = `![Mermaid Diagram](${imageUrl})`",
		);
		expect(imageTools).toContain(
			"> ⚠️ **Mermaid Diagram Could Not Be Rendered**",
		);
	});

	test("Given image-tools.ts When 파일명 생성 검증 Then 결정적 numbering 규칙을 유지한다", () => {
		expect(imageTools).toContain("function deriveFilenameBase");
		expect(imageTools).toContain("/^(\\d{4}-\\d{2}-\\d{2})(?:-(\\d+))?$/");
		expect(imageTools).toContain(
			"const filename = `${filenameBase}-${idx}.png`",
		);
		expect(imageTools).toContain("export async function runGenerateImagesCi");
		expect(imageTools).toContain('logError("generate-images-ci"');
		expect(imageTools).toContain("process.exit(1)");
	});
});
