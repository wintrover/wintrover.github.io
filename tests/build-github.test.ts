import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	buildBlog,
	buildLegacyLocaleAlias,
	buildLegacyPostAliases,
	collectPostEntries,
	copyKoPublicAssets,
	deriveKoPublicAssets,
	findLocaleBoundaryViolations,
	LEGACY_POST_ALIASES,
	renderLegacyLocaleAliasHtml,
	renderLegacyPostAliasHtml,
	renderPostLandingHtml,
	resolvePostSlug,
	validateLegacyPostAliases,
	validatePostCategoryTagConsistency,
	verifyLocaleBoundary,
	verifyPostLandingPages,
	verifySitemapContract,
} from "../scripts/build-github";
import { siteOrigin } from "../src/lib/config";

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	const execFileSync = vi.fn();
	return {
		...actual,
		execFileSync,
		default: { ...actual, execFileSync },
	};
});

let tempRoot: string;

beforeEach(() => {
	tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-github-"));
	fs.mkdirSync(path.join(tempRoot, "src", "lib"), { recursive: true });
	fs.copyFileSync(
		path.resolve("src/lib/categories.json"),
		path.join(tempRoot, "src", "lib", "categories.json"),
	);
});

afterEach(() => {
	fs.rmSync(tempRoot, { recursive: true, force: true });
	vi.restoreAllMocks();
});

function writePost(relativePath: string, content: string) {
	const filePath = path.join(tempRoot, "src", "posts", relativePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content);
}

describe("build-github category/tag consistency", () => {
	test("Axiom 태그 + Archright 카테고리는 통과한다", () => {
		writePost(
			"archright/temp-test-valid.md",
			"---\ncategory: Archright\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		validatePostCategoryTagConsistency(tempRoot);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("Axiom 태그 + Project 카테고리는 빌드 실패한다", () => {
		writePost(
			"project/temp-test-invalid.md",
			"---\ncategory: Project\ntags: [Axiom]\n---\nBody",
		);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		expect(() => validatePostCategoryTagConsistency(tempRoot)).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github legacy locale alias", () => {
	test("/kr alias는 canonical /ko/와 0초 meta refresh를 가진다", () => {
		buildLegacyLocaleAlias(tempRoot);
		const html = fs.readFileSync(
			path.join(tempRoot, "kr", "index.html"),
			"utf-8",
		);
		expect(html).toContain(
			'rel="canonical" href="https://wintrover.github.io/ko/"',
		);
		expect(html).toContain('http-equiv="refresh" content="0; url=/ko/"');
		expect(html).toContain('<noscript><a href="/ko/">');
		expect(html).toContain('<html lang="ko">');
		expect(html).not.toContain("noindex");
	});

	test("renderLegacyLocaleAliasHtml는 독립 HTML 문서를 반환한다", () => {
		const html = renderLegacyLocaleAliasHtml();
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('rel="canonical"');
		expect(html).toContain('http-equiv="refresh"');
	});
});

describe("build-github legacy post alias", () => {
	const alias = LEGACY_POST_ALIASES[0];
	const post = {
		title:
			"The Agent Wrote the Theorem: A Model-Level Disproof, a Pipeline Gap, and a Refusal to Cheat",
		description: "This post moved to a new URL.",
	};
	const targetPath =
		"https://wintrover.github.io/post/the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat/";

	test("LEGACY_POST_ALIASES는 옛 slug를 현재 slug로 매핑한다", () => {
		expect(alias).toEqual({
			from: "the-agent-wrote-the-theorem-a-formal-disproof-a-pipeline-gap-and-a-refusal-to-cheat",
			to: "the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat",
		});
	});

	test("renderLegacyPostAliasHtml는 영어 canonical과 noindex meta refresh를 가진다", () => {
		const html = renderLegacyPostAliasHtml(alias, post);
		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain(`rel="canonical" href="${targetPath}"`);
		expect(html).toContain('<meta name="robots" content="noindex,follow"/>');
		expect(html).toContain(
			'http-equiv="refresh" content="0; url=/#/post/the-agent-wrote-the-theorem-a-model-level-disproof-a-pipeline-gap-and-a-refusal-to-cheat"',
		);
		expect(html).toContain(`<meta property="og:url" content="${targetPath}"`);
		expect(html).toContain(
			'<meta property="og:image" content="https://wintrover.github.io/images/profile.png"/>',
		);
		expect(html).toContain('<meta property="og:site_name" content="Axiom"/>');
	});

	test("buildLegacyPostAliases는 영어 트리에만 별칭을 생성한다", () => {
		buildLegacyPostAliases(tempRoot);
		expect(
			fs.existsSync(path.join(tempRoot, "post", alias.from, "index.html")),
		).toBe(true);
		expect(fs.existsSync(path.join(tempRoot, "ko", "post", alias.from))).toBe(
			false,
		);
	});
});

function mockExit() {
	return vi.spyOn(process, "exit").mockImplementation(() => {
		throw new Error("process.exit");
	});
}

describe("build-github post slug identity", () => {
	test("한국어 제목은 fileName slug로 폴백한다", () => {
		expect(resolvePostSlug("확률적 지능의 시대", "2026-03-17-19")).toBe(
			"2026-03-17-19",
		);
	});

	test("영어 제목은 제목 slug를 사용한다", () => {
		expect(resolvePostSlug("A Model-Level Disproof", "ignored-file-name")).toBe(
			"a-model-level-disproof",
		);
	});

	test("제목과 fileName이 모두 slug를 만들지 못하면 빈 문자열이다", () => {
		expect(resolvePostSlug("", "")).toBe("");
	});
});

describe("build-github collectPostEntries slug contract", () => {
	test("한국어 제목 포스트는 fileName slug로 포함된다", () => {
		writePost(
			"ko/2026-03-17-19.md",
			"---\ntitle: 확률적 지능의 시대\ndate: 2026-03-17\n---\nBody",
		);
		const entries = collectPostEntries(tempRoot, "ko");
		expect(entries.map((entry) => entry.slug)).toEqual(["2026-03-17-19"]);
	});

	test("한 locale에서 파생 slug가 중복되면 빌드 실패한다", () => {
		writePost("ko/dup-a.md", "---\ntitle: Duplicate Slug\n---\nA");
		writePost("ko/dup-b.md", "---\ntitle: Duplicate Slug\n---\nB");
		const exitSpy = mockExit();
		expect(() => collectPostEntries(tempRoot, "ko")).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test("slug를 파생할 수 없는 파일은 조용히 건너뛰지 않고 빌드 실패한다", () => {
		writePost("ko/한글.md", "---\ndate: 2026-03-17\n---\nBody");
		const exitSpy = mockExit();
		expect(() => collectPostEntries(tempRoot, "ko")).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github legacy post alias registry validation", () => {
	test("유효한 레지스트리는 통과한다", () => {
		writePost("current-english-post.md", "---\ndate: 2026-01-01\n---\nBody");
		const exitSpy = mockExit();
		validateLegacyPostAliases(tempRoot, [
			{ from: "legacy-old-post", to: "current-english-post" },
		]);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("from === to이면 빌드 실패한다", () => {
		writePost("current-english-post.md", "---\ndate: 2026-01-01\n---\nBody");
		mockExit();
		expect(() =>
			validateLegacyPostAliases(tempRoot, [
				{ from: "same-slug", to: "same-slug" },
			]),
		).toThrow("process.exit");
	});

	test("from 중복이면 빌드 실패한다", () => {
		writePost("current-english-post.md", "---\ndate: 2026-01-01\n---\nBody");
		mockExit();
		expect(() =>
			validateLegacyPostAliases(tempRoot, [
				{ from: "duplicate-from", to: "current-english-post" },
				{ from: "duplicate-from", to: "current-english-post" },
			]),
		).toThrow("process.exit");
	});

	test("from이 현재 영어 slug와 충돌하면 빌드 실패한다", () => {
		writePost("current-english-post.md", "---\ndate: 2026-01-01\n---\nBody");
		writePost("other-current-post.md", "---\ndate: 2026-01-02\n---\nBody");
		mockExit();
		expect(() =>
			validateLegacyPostAliases(tempRoot, [
				{ from: "current-english-post", to: "other-current-post" },
			]),
		).toThrow("process.exit");
	});

	test("to가 현재 영어 slug에 없으면 빌드 실패한다", () => {
		writePost("current-english-post.md", "---\ndate: 2026-01-01\n---\nBody");
		mockExit();
		expect(() =>
			validateLegacyPostAliases(tempRoot, [
				{ from: "legacy-old-post", to: "missing-target" },
			]),
		).toThrow("process.exit");
	});
});

describe("build-github post landing verification", () => {
	const distRoot = () => path.join(tempRoot, "dist");
	const entry = {
		slug: "landing-post",
		title: "Landing Post",
		description: "Landing description",
		date: "2026-01-02",
	};

	function writeLanding(locale: "ko" | "en", content?: string) {
		const localeDir =
			locale === "ko" ? path.join(distRoot(), "ko") : distRoot();
		const filePath = path.join(localeDir, "post", entry.slug, "index.html");
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content ?? renderPostLandingHtml(locale, entry));
	}

	test("렌더러 출력과 일치하는 랜딩은 통과한다", () => {
		writePost(
			"landing-post.md",
			"---\ntitle: Landing Post\ndescription: Landing description\ndate: 2026-01-02\n---\nBody",
		);
		writeLanding("en");
		const exitSpy = mockExit();
		verifyPostLandingPages(distRoot(), tempRoot);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("canonical이 변조된 랜딩은 빌드 실패한다", () => {
		writePost(
			"landing-post.md",
			"---\ntitle: Landing Post\ndescription: Landing description\ndate: 2026-01-02\n---\nBody",
		);
		writeLanding(
			"en",
			renderPostLandingHtml("en", entry).replace(
				'rel="canonical" href="https://wintrover.github.io/post/landing-post/"',
				'rel="canonical" href="https://wintrover.github.io/post/tampered/"',
			),
		);
		const exitSpy = mockExit();
		expect(() => verifyPostLandingPages(distRoot(), tempRoot)).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test("랜딩 파일이 없으면 빌드 실패한다", () => {
		writePost(
			"landing-post.md",
			"---\ntitle: Landing Post\ndescription: Landing description\ndate: 2026-01-02\n---\nBody",
		);
		const exitSpy = mockExit();
		expect(() => verifyPostLandingPages(distRoot(), tempRoot)).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github sitemap contract", () => {
	const expectedLocs = () => [
		`${siteOrigin}/`,
		`${siteOrigin}/ko/`,
		`${siteOrigin}/resume/`,
		`${siteOrigin}/ko/resume/`,
		`${siteOrigin}/post/landing-post/`,
		`${siteOrigin}/ko/post/2026-03-17-19/`,
	];

	function writeFixturePosts() {
		writePost(
			"landing-post.md",
			"---\ntitle: Landing Post\ndate: 2026-01-02\n---\nBody",
		);
		writePost(
			"ko/2026-03-17-19.md",
			"---\ntitle: 한국어 제목\ndate: 2026-03-17\n---\nBody",
		);
	}

	function writeSitemap(locs: string[]) {
		const body = locs.map((loc) => `<url><loc>${loc}</loc></url>`).join("");
		fs.mkdirSync(path.join(tempRoot, "dist"), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, "dist", "sitemap.xml"),
			`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
		);
	}

	test("기대 URL 다중집합과 정확히 일치하면 통과한다", () => {
		writeFixturePosts();
		writeSitemap(expectedLocs());
		const exitSpy = mockExit();
		verifySitemapContract(path.join(tempRoot, "dist"), tempRoot);
		expect(exitSpy).not.toHaveBeenCalled();
	});

	test("URL이 누락되면 빌드 실패한다", () => {
		writeFixturePosts();
		writeSitemap(expectedLocs().slice(1));
		const exitSpy = mockExit();
		expect(() =>
			verifySitemapContract(path.join(tempRoot, "dist"), tempRoot),
		).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test("URL이 중복되면 빌드 실패한다", () => {
		writeFixturePosts();
		writeSitemap([...expectedLocs(), `${siteOrigin}/post/landing-post/`]);
		const exitSpy = mockExit();
		expect(() =>
			verifySitemapContract(path.join(tempRoot, "dist"), tempRoot),
		).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test("레거시 alias from이 sitemap에 노출되면 빌드 실패한다", () => {
		writeFixturePosts();
		writeSitemap([
			...expectedLocs(),
			`${siteOrigin}/post/${LEGACY_POST_ALIASES[0].from}/`,
		]);
		const exitSpy = mockExit();
		expect(() =>
			verifySitemapContract(path.join(tempRoot, "dist"), tempRoot),
		).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github Korean public asset derivation", () => {
	test("한국어 포스트가 참조하는 자산만 정렬·중복 제거해 파생한다", () => {
		const assets = deriveKoPublicAssets(process.cwd());
		expect(assets).toEqual([...new Set(assets)].sort());
		expect(assets).toContain("images/profile.png");
		expect(assets).toHaveLength(36);
		for (const asset of assets) {
			expect(fs.existsSync(path.resolve("public", asset))).toBe(true);
		}
	});

	test("한국어 사이트가 사용하지 않는 public 이미지는 파생 집합에 포함되지 않는다", () => {
		const assets = new Set(deriveKoPublicAssets(process.cwd()));
		expect(assets.has("images/404.jpg")).toBe(false);
		expect(assets.has("images/404-error.jpg")).toBe(false);
		expect(assets.has("images/kyc-sequence-diagram.svg")).toBe(false);
	});

	test("파생 자산이 public에 없으면 빌드 실패한다", () => {
		fs.mkdirSync(path.join(tempRoot, "public", "images"), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, "public", "images", "profile.png"),
			"profile",
		);
		writePost(
			"ko/missing-asset.md",
			"---\ntitle: Missing Asset\n---\n![missing](/images/does-not-exist.png)",
		);
		const exitSpy = mockExit();
		expect(() => deriveKoPublicAssets(tempRoot)).toThrow("process.exit");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github Korean public asset copy", () => {
	test("copyKoPublicAssets는 지정한 자산만 dist/ko로 복사한다", () => {
		fs.mkdirSync(path.join(tempRoot, "public", "images", "nested"), {
			recursive: true,
		});
		fs.writeFileSync(
			path.join(tempRoot, "public", "images", "profile.png"),
			"profile",
		);
		fs.writeFileSync(
			path.join(tempRoot, "public", "images", "nested", "extra.png"),
			"extra",
		);
		copyKoPublicAssets(tempRoot, path.join(tempRoot, "dist"), [
			"images/profile.png",
		]);
		expect(
			fs.readFileSync(
				path.join(tempRoot, "dist", "ko", "images", "profile.png"),
				"utf-8",
			),
		).toBe("profile");
		expect(
			fs.existsSync(
				path.join(tempRoot, "dist", "ko", "images", "nested", "extra.png"),
			),
		).toBe(false);
	});
});

describe("build-github locale boundary verification", () => {
	const distRoot = () => path.join(tempRoot, "dist");
	const koPostSlug = "ko-post";
	const enPostSlug = "en-post";

	function writeFixture() {
		fs.mkdirSync(path.join(tempRoot, "public", "images"), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, "public", "images", "profile.png"),
			"profile",
		);
		writePost("en-post.md", "---\ntitle: En Post\n---\nBody");
		writePost("ko/ko-post.md", "---\ntitle: Ko Post\n---\nBody");

		const dist = distRoot();
		const files = [
			"index.html",
			"ko/index.html",
			"ko/resume/index.html",
			"resume/index.html",
			"404.html",
			".nojekyll",
			"kr/index.html",
		];
		for (const relativePath of files) {
			const filePath = path.join(dist, relativePath);
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, "");
		}
		fs.mkdirSync(path.join(dist, "evidence"), { recursive: true });
		for (const relativePath of [
			"images/profile.png",
			"ko/images/profile.png",
		]) {
			const filePath = path.join(dist, relativePath);
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, "profile");
		}
		fs.mkdirSync(path.join(dist, "ko", "post", koPostSlug), {
			recursive: true,
		});
		fs.mkdirSync(path.join(dist, "post", enPostSlug), { recursive: true });
		fs.mkdirSync(path.join(dist, "post", LEGACY_POST_ALIASES[0].from), {
			recursive: true,
		});
	}

	test("경계를 지키는 산출물은 위반이 없다", () => {
		writeFixture();
		expect(findLocaleBoundaryViolations(distRoot(), tempRoot)).toEqual([]);
	});

	test("KO 트리에 금지된 파일이 있으면 위반이다", () => {
		writeFixture();
		fs.writeFileSync(path.join(distRoot(), "ko", "404.html"), "");
		expect(findLocaleBoundaryViolations(distRoot(), tempRoot)).toContain(
			"forbidden in Korean tree: ko/404.html",
		);
	});

	test("KO 이미지 집합이 파생 집합과 다르면 위반이다", () => {
		writeFixture();
		fs.writeFileSync(
			path.join(distRoot(), "ko", "images", "unused.png"),
			"unused",
		);
		const violations = findLocaleBoundaryViolations(distRoot(), tempRoot);
		expect(
			violations.some((violation) =>
				violation.includes("dist/ko/images asset set mismatch"),
			),
		).toBe(true);
	});

	test("경계 위반 시 verifyLocaleBoundary는 빌드를 실패시킨다", () => {
		writeFixture();
		fs.writeFileSync(path.join(distRoot(), "ko", "404.html"), "");
		const exitSpy = mockExit();
		expect(() => verifyLocaleBoundary(distRoot(), tempRoot)).toThrow(
			"process.exit",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe("build-github blog build environment", () => {
	test("ko 빌드는 publicDir 복사를 끄고 en 빌드는 켠다", () => {
		const execSpy = vi.mocked(execFileSync);
		execSpy.mockClear();
		const dist = path.join(tempRoot, "dist");
		buildBlog(dist, "en");
		buildBlog(dist, "ko");
		const enOptions = execSpy.mock.calls[0]?.[2] as unknown as {
			env?: Record<string, string>;
		};
		const koOptions = execSpy.mock.calls[1]?.[2] as unknown as {
			env?: Record<string, string>;
		};
		expect(enOptions.env?.COPY_PUBLIC_DIR).toBe("true");
		expect(koOptions.env?.COPY_PUBLIC_DIR).toBe("false");
		expect(enOptions.env?.VITE_OUT_DIR).toBe(dist);
		expect(koOptions.env?.VITE_OUT_DIR).toBe(path.join(dist, "ko"));
		expect(enOptions.env?.VITE_BASE_PATH).toBe("/");
		expect(koOptions.env?.VITE_BASE_PATH).toBe("/ko/");
	});
});
