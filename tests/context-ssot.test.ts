import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function read(rel: string) {
	return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("SSoT 도메인 계약 규칙 전수 검증", () => {
	const feature = read("tests/features/context-architecture.feature");
	const agents = read("AGENTS.md");
	const urlSpec = read("docs/spec/url-architecture.md");
	const buildSpec = read("docs/spec/build-pipeline.md");
	const uiSpec = read("docs/spec/ui-design.md");
	const postSpec = read("docs/spec/post-creation.md");
	const buildScript = read("scripts/build-github.ts");
	const pagesWorkflow = read(".github/workflows/pages-deploy.yml");
	const imageTools = read("scripts/image-tools.ts");
	const locale = read("src/lib/locale.ts");
	const config = read("src/lib/config.ts");
	const app = read("src/App.svelte");
	const blogList = read("src/components/BlogList.svelte");
	const homePage = read("src/routes/+page.svelte");
	const postFeed = read("src/components/PostFeed.svelte");
	const postDetail = read("src/components/PostDetail.svelte");
	const notFound = read("src/components/NotFound.svelte");
	const resumePage = read("src/components/ResumePage.svelte");
	const seoController = read("src/lib/seo.ts");
	const mainEntry = read("src/main.ts");
	const indexTemplate = read("index.html");

	test("Given 도메인 계약 When 검토 Then 필수 헌법 규칙이 빠짐없이 존재한다", () => {
		expect(agents).toContain("SSOT 원칙");
		expect(agents).toContain("규칙은 한 곳에 산다");
		expect(urlSpec).toContain("기본 언어는 영어");
		expect(urlSpec).toContain("/ko/");
		expect(urlSpec).toContain("/en/");
		expect(buildSpec).toContain("브랜드 메타데이터");
		expect(buildSpec).toContain("build-github.ts");
		expect(buildSpec).toContain("image-tools.ts");
		expect(uiSpec).toContain("세로 정렬");
		expect(uiSpec).toContain("일정한 카드 크기");
		expect(uiSpec).toContain("동일한 포스트 리스트 UI 컴포넌트");
		expect(uiSpec).toContain("Geist 다크 테마");
		expect(uiSpec).toContain("zinc 기반 중성 팔레트");
		expect(uiSpec).toContain("시각 밀도");
		expect(uiSpec).toContain("수직 리듬 스케일 토큰");
		expect(postSpec).toContain("exclusiveTags");
		expect(postSpec).toContain("YYYY-MM-DD-N.md");
	});

	test("Given feature 파일 When 파싱 Then 시나리오 카탈로그가 SSoT와 일치한다", () => {
		const expected = [
			"도메인 계약 문서가 핵심 헌법 규칙을 포함한다",
			"URL architecture uses root for English and /ko for Korean",
			"Locale detection must not treat /en as locale path",
			"Canonical SEO path must follow locale prefix policy",
			"Brand metadata should be derived from one shared source",
			"Blog list canonical URL must not emit /en fallback",
			"Blog list layout keeps vertical flow and equal card size",
			"Mobile app content fits viewport width without horizontal overflow",
			"Mobile sidebar actions should close drawer consistently",
			"Locale and posts loading logic should reuse shared helpers",
			"All list routes reuse one post list UI source",
			"Post detail page keeps Geist dark visual language",
			"Post detail markdown should not overflow mobile viewport",
			"Post route hero motion must replay on route entry",
			"Build output verification enforces deployment entrypoints",
			"Sitemap generation preserves locale architecture",
			"GEO robots directives preserve AI discoverability controls",
			"Build and Mermaid pipelines keep critical invariants",
			"Mermaid image naming and fallback handling remain deterministic",
			"Transient post loading failures must be retryable",
			"Post path category mapping must be prototype-safe",
			"Legacy Project category should normalize to Personal project",
			"Pages workflow injects analytics env from secrets with vars fallback",
			"Korean post titles fall back to fileName slug",
			"Every collected post has a static landing page",
			"Legacy post aliases are permanent and validated",
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

	test("Given locale 관련 컴포넌트 When DRY 검증 Then locale helper를 공통 재사용한다", () => {
		expect(locale).toContain("export function localePrefix");
		expect(locale).toContain("export function detectLocaleFromRuntime");
		expect(config).toContain("localePrefix(resolvedLocale)");
		expect(postDetail).toContain("detectLocaleFromRuntime(");
		expect(blogList).toContain("detectLocaleFromRuntime(");
		const resumePage = read("src/components/ResumePage.svelte");
		expect(resumePage).toContain("detectLocaleFromRuntime(");
		expect(resumePage).toContain("localePrefix(resolvedLocale)");
	});

	test("Given 리스트 라우트 When 로딩 로직 검증 Then requestedPosts 중복 가드가 제거된다", () => {
		expect(homePage).not.toContain("requestedPosts");
		expect(blogList).not.toContain("requestedPosts");
		expect(homePage).not.toContain("ensurePostsLoaded");
		expect(blogList).not.toContain("ensurePostsLoaded");
	});

	test("Given post SEO 생성 When locale 적용 Then canonical prefix가 규칙을 따른다", () => {
		expect(config).toContain(
			"const localePathPrefix = localePrefix(resolvedLocale)",
		);
		expect(config).toContain("`${origin}${localePathPrefix}/post/${slug}/`");
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

	test("Given 포스트 상세 페이지 When 모바일 overflow 안전성 검증 Then 본문 wide 요소가 내부 스크롤을 사용한다", () => {
		expect(postDetail).toContain("box-sizing: border-box");
		expect(postDetail).toContain("overflow-wrap: anywhere");
		expect(postDetail).toContain("display: block");
		expect(postDetail).toContain("overflow-x: auto");
		expect(postDetail).toContain("max-width: 100%");
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
		expect(buildScript).toContain(
			'...contract.urls\n\t\t\t.filter((entry) => entry.kind === "alias")',
		);
		expect(buildScript).toContain(
			'path.join(distPath, ...aliasPathSegments(entry.url), "index.html")',
		);
		expect(buildScript).not.toContain(
			'path.join(distPath, "en", "index.html")',
		);
		expect(buildScript).toContain("process.exit(1)");
	});

	test("Given build-github.ts When slug·랜딩·sitemap 계약 검증 Then fail-closed 검증기를 호출한다", () => {
		expect(buildScript).toContain("resolvePostSlug");
		expect(buildScript).toContain("validateUrlContractAliases(root, contract)");
		expect(buildScript).toContain("verifyPostLandingPages(dist, root)");
		expect(buildScript).toContain(
			"verifySitemapContract(dist, root, contract)",
		);
		expect(buildScript).not.toContain("LEGACY_POST_ALIASES");
		expect(urlSpec).toContain("fileName");
		expect(urlSpec).toContain("영구 보존");
		expect(buildSpec).toContain("정적 랜딩");
		expect(buildSpec).toContain("조용히");
	});

	test("Given public assets When locale 산출물 검증 Then 영어 전용 문서는 public에 두지 않는다", () => {
		expect(fs.existsSync(path.join(root, "public", "post"))).toBe(false);
		expect(fs.existsSync(path.join(root, "public", "kr"))).toBe(false);
		expect(buildScript).toContain("buildAliasPages(dist, root, contract)");
		expect(buildScript).toContain("verifyAliasOutputs(dist, root, contract)");
		expect(buildScript).not.toContain("LEGACY_POST_ALIASES");
		const aliasFn = buildScript.slice(
			buildScript.indexOf("export function buildAliasPages"),
			buildScript.indexOf("function verifyBuildOutput"),
		);
		expect(aliasFn).toContain("resolveAlias(contract, alias.url)");
		expect(aliasFn).toContain("renderLegacyPostAliasHtml");
		expect(aliasFn).toContain("renderLegacyLocaleAliasHtml");
		expect(aliasFn).toContain('path.join(dist, "ko", "post", origin.slug)');
		expect(aliasFn).not.toContain('writeFile(path.join(dist, "ko"');
	});

	test("Given locale 출력 경계 When 검증 Then 공개 자산 경계는 fail-closed다", () => {
		expect(buildScript).toContain("deriveKoPublicAssets");
		expect(buildScript).toContain("copyKoPublicAssets");
		expect(buildScript).toContain("findLocaleBoundaryViolations");
		expect(buildScript).toContain("verifyLocaleBoundary(dist, root, contract)");
		expect(buildScript).toContain("COPY_PUBLIC_DIR");
		expect(buildSpec).toContain("deriveKoPublicAssets");
		expect(buildSpec).toContain("locale 출력 경계");
	});

	test("Given build-github.ts When legacy alias 검증 Then /kr을 locale로 승격하지 않는다", () => {
		const sitemapFn = buildScript.slice(
			buildScript.indexOf("function buildSitemap"),
			buildScript.indexOf("function buildRobots"),
		);
		expect(sitemapFn).not.toContain("kr");
		expect(locale).not.toContain("kr");
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

	test("Given GEO 정책 When robots와 메타 검증 Then AI 검색 제어 지시어를 유지한다", () => {
		expect(buildSpec).toContain(
			"max-image-preview:large,max-snippet:-1,max-video-preview:-1",
		);
		expect(indexTemplate).toContain(
			'content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"',
		);
		expect(buildScript).toContain("const robotsMetaContent =");
		expect(buildScript).toContain('content="${robotsMetaContent}"');
		expect(buildScript).toContain("User-agent: Google-Extended");
		expect(buildScript).toContain("Allow: /");
	});

	test("Given Pages workflow When 빌드 env 매핑 Then analytics 변수는 secrets 우선 vars fallback 규칙을 따른다", () => {
		expect(pagesWorkflow).toContain(
			"VITE_GA_MEASUREMENT_ID: ${{ secrets.VITE_GA_MEASUREMENT_ID || vars.VITE_GA_MEASUREMENT_ID }}",
		);
		expect(pagesWorkflow).toContain(
			"VITE_GOOGLE_SITE_VERIFICATION: ${{ vars.VITE_GOOGLE_SITE_VERIFICATION || secrets.VITE_GOOGLE_SITE_VERIFICATION }}",
		);
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

	test("Given URL contract When 스펙 검증 Then append-only 권위와 보장 범위가 명시된다", () => {
		const urlContractSpec = read("docs/spec/url-contract.md");
		expect(urlContractSpec).toContain("url-contract.json");
		expect(urlContractSpec).toContain("append-only");
		expect(urlContractSpec).toContain("bootstrap");
		expect(urlContractSpec).toContain("보장 범위");
		expect(urlContractSpec).toContain("ruleset bypass");
		expect(urlContractSpec).toContain("sitemap");
		expect(urlContractSpec).toContain("퍼지");
		expect(buildSpec).toContain("url-contract.json");
		expect(urlSpec).toContain("url-contract.json");
	});

	test("Given SPA head identity When 검증 Then canonical·title은 단일 컨트롤러가 소유한다", () => {
		expect(urlSpec).toContain("SPA head identity");
		expect(seoController).toContain('link[rel="canonical"]');
		expect(seoController).toContain("document.title =");
		expect(seoController).toContain('data-seo-owner="spa"');
		for (const component of [postDetail, blogList, notFound, resumePage]) {
			expect(component).not.toContain('rel="canonical"');
			expect(component).not.toContain("<title>");
		}
		expect(mainEntry).not.toContain("canonical.href");
		expect(indexTemplate).toContain('rel="canonical"');
	});

	test("Given 공개 계약 When 보장 경계 문서 검증 Then 보장·비보장·UNKNOWN 구획이 존재한다", () => {
		const urlContractSpec = read("docs/spec/url-contract.md");
		const guarantees = read("docs/spec/public-contract-guarantees.md");
		expect(urlContractSpec).toContain("public-contract-guarantees.md");
		for (const section of [
			"## 보장 (Guaranteed)",
			"## 보장하지 않음 (Not guaranteed)",
			"## UNKNOWN 결정 등록부",
			"## 권위 체인 (Authority chain)",
			"## 참조 (References)",
		]) {
			expect(guarantees).toContain(section);
		}
		for (const id of [
			"UNKNOWN-A",
			"UNKNOWN-B",
			"UNKNOWN-D",
			"UNKNOWN-E",
			"UNKNOWN-ADV",
		]) {
			expect(guarantees).toContain(id);
		}
		for (const field of [
			"코드로 결정할 수 없는 이유",
			"오너",
			"결정 트리거",
			"다음 행동",
		]) {
			expect(guarantees.split(field).length - 1).toBeGreaterThanOrEqual(5);
		}
		expect(guarantees).toContain("registry");
		expect(guarantees).toContain("sitemap");
		expect(guarantees).toContain("append-only");
		expect(guarantees).toContain("noindex,follow");
		expect(guarantees).toContain("수동 witness");
	});

	test("Given 공개 계약 When 비보장 주장 검증 Then 과잉 주장이 없다", () => {
		const guarantees = read("docs/spec/public-contract-guarantees.md");
		const guaranteedSection = guarantees.slice(
			guarantees.indexOf("## 보장 (Guaranteed)"),
			guarantees.indexOf("## 보장하지 않음 (Not guaranteed)"),
		);
		const notGuaranteedSection = guarantees.slice(
			guarantees.indexOf("## 보장하지 않음 (Not guaranteed)"),
			guarantees.indexOf("## UNKNOWN 결정 등록부"),
		);
		expect(guaranteedSection).not.toContain("301");
		expect(guaranteedSection).not.toContain("308");
		expect(guaranteedSection).not.toContain("불변");
		expect(guaranteedSection).not.toContain("Rekor");
		expect(notGuaranteedSection).toContain("ruleset bypass");
		expect(notGuaranteedSection).toContain("SHA256SUMS");
		expect(notGuaranteedSection).toContain("301");
		expect(guarantees).toContain(
			"CI(`validate`)·pre-commit(`prek`)에 연결되지 않는다",
		);
		expect(guarantees).toContain("감사 항목");
	});
});
