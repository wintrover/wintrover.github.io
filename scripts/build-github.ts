import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	defaultOgImage,
	getBlogBuildMeta,
	siteOrigin,
} from "../src/lib/config";
import { logError } from "../src/lib/log";
import { renderMarkdownBody } from "../src/lib/markdown";
import { parseFrontMatter } from "../src/lib/utils";
import { collectPostEntries, walkMarkdownFiles } from "./post-entries";
import {
	deriveCanonicalUrls,
	parsePostAliasUrl,
	parseUrlContract,
	resolveAlias,
	URL_CONTRACT_FILE,
	type UrlContract,
	type UrlLocale,
	validateUrlContract,
} from "./public-urls";

export { collectPostEntries, resolvePostSlug } from "./post-entries";

type Env = Record<string, string | undefined>;
type ResumeMeta = {
	title?: string;
	description?: string;
	og_title?: string;
	og_description?: string;
	og_type?: string;
};
type ResumeLocaleJson = {
	meta?: ResumeMeta;
};
const robotsMetaContent =
	"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

type LegacyPostAliasTarget = {
	title: string;
	description: string;
};

function run(cmd: string, args: string[], env: Env = {}) {
	execFileSync(cmd, args, {
		stdio: "inherit",
		env: { ...process.env, ...env },
		shell: process.platform === "win32",
	});
}

function rm(target: string) {
	fs.rmSync(target, { recursive: true, force: true });
}

function mk(target: string) {
	fs.mkdirSync(target, { recursive: true });
}

function writeFile(target: string, content: string) {
	mk(path.dirname(target));
	fs.writeFileSync(target, content);
}

export function buildBlog(dist: string, locale: "ko" | "en") {
	const basePath = locale === "ko" ? "/ko/" : "/";
	const outDir = locale === "ko" ? path.join(dist, "ko") : dist;
	const meta = getBlogBuildMeta(locale);
	run(process.execPath, ["./node_modules/vite/bin/vite.js", "build"], {
		VITE_BASE_PATH: basePath,
		VITE_OUT_DIR: outDir,
		VITE_LOCALE: locale,
		VITE_HTML_LANG: locale,
		VITE_META_DESCRIPTION: meta.metaDescription,
		VITE_OG_TITLE: meta.ogTitle,
		VITE_OG_DESCRIPTION: meta.ogDescription,
		VITE_OG_IMAGE_ALT: meta.ogImageAlt,
		COPY_PUBLIC_DIR: locale === "ko" ? "false" : "true",
	});
}

function xmlEscape(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function deriveKoPublicAssets(root: string): string[] {
	const koPostsDir = path.join(root, "src", "posts", "ko");
	const assets = new Set<string>(["images/profile.png"]);
	if (fs.existsSync(koPostsDir)) {
		for (const filePath of walkMarkdownFiles(koPostsDir)) {
			const raw = fs.readFileSync(filePath, "utf-8");
			const { content } = parseFrontMatter(raw);
			const html = renderMarkdownBody(content, "/");
			for (const match of html.matchAll(/src\s*=\s*(["'])([^"']+)\1/g)) {
				const src = match[2];
				if (!src.startsWith("/images/")) continue;
				assets.add(src.slice(1));
			}
		}
	}

	const sorted = [...assets].sort();
	for (const relativePath of sorted) {
		const absolutePath = path.join(root, "public", relativePath);
		if (fs.existsSync(absolutePath)) continue;
		logError(
			"build-github",
			`Korean public asset missing under public/: ${relativePath}`,
			{ error: new Error(`missing public asset: ${relativePath}`) },
		);
		process.exit(1);
	}
	return sorted;
}

export function copyKoPublicAssets(
	root: string,
	dist: string,
	assets: string[] = deriveKoPublicAssets(root),
) {
	for (const relativePath of assets) {
		const sourcePath = path.join(root, "public", relativePath);
		const targetPath = path.join(dist, "ko", relativePath);
		mk(path.dirname(targetPath));
		fs.copyFileSync(sourcePath, targetPath);
	}
}

function buildResumeLandingPage(dist: string, locale: "ko" | "en") {
	const localeDir = locale === "ko" ? path.join(dist, "ko") : dist;
	const localePrefix = locale === "ko" ? "/ko" : "";
	const resumeLocalePath = path.join(
		process.cwd(),
		"src",
		"lib",
		"resume",
		"locales",
		`${locale}.json`,
	);
	const raw = fs.readFileSync(resumeLocalePath, "utf8");
	const json = JSON.parse(raw) as ResumeLocaleJson;
	const title = String(json?.meta?.title ?? "resume");
	const description = String(
		json?.meta?.description ??
			"Axiom, the site of an Integrity Proof Engineer who verifies the claims of AI-generated software as machine-reproducible evidence.",
	);
	const canonical = `${siteOrigin}${localePrefix}/resume/`;
	const redirect = `${localePrefix}/#/resume`;
	const ogTitle = String(json?.meta?.og_title ?? title);
	const ogDescription = String(json?.meta?.og_description ?? description);
	const ogType = String(json?.meta?.og_type ?? "website");
	const ogImageAlt =
		locale === "ko" ? "Axiom 프로필 이미지" : "Axiom profile image";

	const html =
		`<!doctype html>` +
		`<html lang="${xmlEscape(locale)}" prefix="og: https://ogp.me/ns#">` +
		`<head>` +
		`<meta charset="utf-8"/>` +
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
		`<title>${xmlEscape(title)}</title>` +
		`<meta name="description" content="${xmlEscape(description)}"/>` +
		`<meta name="robots" content="${robotsMetaContent}"/>` +
		`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
		`<link rel="alternate" hreflang="ko" href="${siteOrigin}/ko/resume/"/>` +
		`<link rel="alternate" hreflang="en" href="${siteOrigin}/resume/"/>` +
		`<link rel="alternate" hreflang="x-default" href="${siteOrigin}/"/>` +
		`<meta property="og:title" content="${xmlEscape(ogTitle)}"/>` +
		`<meta property="og:description" content="${xmlEscape(ogDescription)}"/>` +
		`<meta property="og:type" content="${xmlEscape(ogType)}"/>` +
		`<meta property="og:url" content="${xmlEscape(canonical)}"/>` +
		`<meta property="og:image" content="${xmlEscape(defaultOgImage)}"/>` +
		`<meta property="og:image:alt" content="${xmlEscape(ogImageAlt)}"/>` +
		`<meta property="og:site_name" content="Axiom"/>` +
		`<script>(()=>{location.replace(${JSON.stringify(redirect)});})();</script>` +
		`</head>` +
		`<body>` +
		`<noscript><a href="${xmlEscape(redirect)}">Open resume</a></noscript>` +
		`</body>` +
		`</html>`;

	writeFile(path.join(localeDir, "resume", "index.html"), html);
}

export function renderPostLandingHtml(
	locale: "ko" | "en",
	post: {
		slug: string;
		title: string;
		description: string;
		date: string | null;
	},
): string {
	const localePrefix = locale === "ko" ? "/ko" : "";
	const canonical = `${siteOrigin}${localePrefix}/post/${post.slug}/`;
	const redirect = `${localePrefix}/#/post/${post.slug}`;
	const title = post.title;
	const description = post.description || post.title;
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		image: [defaultOgImage],
		datePublished: post.date ?? undefined,
		dateModified: post.date ?? undefined,
		author: {
			"@type": "Person",
			name: "wintrover",
			url: `${siteOrigin}/`,
		},
		description,
		mainEntityOfPage: canonical,
	};
	const jsonLdString = JSON.stringify(jsonLd).replaceAll("<", "\\u003c");

	return (
		`<!doctype html>` +
		`<html lang="${xmlEscape(locale)}" prefix="og: https://ogp.me/ns#">` +
		`<head>` +
		`<meta charset="utf-8"/>` +
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
		`<title>${xmlEscape(title)}</title>` +
		`<meta name="description" content="${xmlEscape(description)}"/>` +
		`<meta name="robots" content="${robotsMetaContent}"/>` +
		`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
		`<meta property="og:title" content="${xmlEscape(post.title)}"/>` +
		`<meta property="og:description" content="${xmlEscape(description)}"/>` +
		`<meta property="og:type" content="article"/>` +
		`<meta property="og:url" content="${xmlEscape(canonical)}"/>` +
		`<meta property="og:image" content="${xmlEscape(defaultOgImage)}"/>` +
		`<meta property="og:image:alt" content="${xmlEscape(post.title)}"/>` +
		`<meta property="og:site_name" content="Axiom"/>` +
		`<script type="application/ld+json">${jsonLdString}</script>` +
		`<script>(()=>{location.replace(${JSON.stringify(redirect)});})();</script>` +
		`</head>` +
		`<body>` +
		`<noscript><a href="${xmlEscape(redirect)}">Open post</a></noscript>` +
		`</body>` +
		`</html>`
	);
}

function buildPostLandingPages(dist: string, locale: "ko" | "en") {
	const root = process.cwd();
	const localeDir = locale === "ko" ? path.join(dist, "ko") : dist;
	const posts = collectPostEntries(root, locale);
	for (const post of posts) {
		writeFile(
			path.join(localeDir, "post", post.slug, "index.html"),
			renderPostLandingHtml(locale, post),
		);
	}
}

export function verifyPostLandingPages(dist: string, root: string) {
	for (const locale of ["ko", "en"] as const) {
		const localeDir = locale === "ko" ? path.join(dist, "ko") : dist;
		for (const post of collectPostEntries(root, locale)) {
			const filePath = path.join(localeDir, "post", post.slug, "index.html");
			const relativePath = path.relative(dist, filePath).replaceAll("\\", "/");
			if (!fs.existsSync(filePath)) {
				logError("build-github", `Post landing page missing: ${relativePath}`, {
					error: new Error(`missing post landing: ${relativePath}`),
				});
				process.exit(1);
			}
			const actual = fs.readFileSync(filePath, "utf-8");
			const expected = renderPostLandingHtml(locale, post);
			if (actual !== expected) {
				logError(
					"build-github",
					`Post landing canonical/redirect mismatch: ${relativePath}`,
					{ error: new Error(`post landing mismatch: ${relativePath}`) },
				);
				process.exit(1);
			}
		}
	}
}

function buildSitemap(dist: string) {
	const root = process.cwd();
	const base = siteOrigin;
	const urls: { loc: string; lastmod?: string }[] = [];

	urls.push({ loc: `${base}/` });
	urls.push({ loc: `${base}/ko/` });
	urls.push({ loc: `${base}/resume/` });
	urls.push({ loc: `${base}/ko/resume/` });

	for (const locale of ["ko", "en"] as const) {
		const posts = collectPostEntries(root, locale);
		for (const post of posts) {
			const localePrefix = locale === "ko" ? "/ko" : "";
			const loc = `${base}${localePrefix}/post/${post.slug}/`;
			if (post.lastmod) {
				urls.push({ loc, lastmod: post.lastmod });
			} else {
				urls.push({ loc });
			}
		}
	}

	const body = urls
		.map((u) => {
			const loc = `<loc>${xmlEscape(u.loc)}</loc>`;
			const lastmod = u.lastmod
				? `<lastmod>${xmlEscape(u.lastmod)}</lastmod>`
				: "";
			return `<url>${loc}${lastmod}</url>`;
		})
		.join("");

	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
		body +
		`</urlset>`;

	writeFile(path.join(dist, "sitemap.xml"), xml);
}

export function verifySitemapContract(
	dist: string,
	root: string,
	contract: UrlContract = loadUrlContract(root),
) {
	const sitemapPath = path.join(dist, "sitemap.xml");
	if (!fs.existsSync(sitemapPath)) {
		logError("build-github", "Sitemap missing: dist/sitemap.xml", {
			error: new Error("sitemap.xml not found"),
		});
		process.exit(1);
	}
	const xml = fs.readFileSync(sitemapPath, "utf-8");
	const actual = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

	const expected = [
		`${siteOrigin}/`,
		`${siteOrigin}/ko/`,
		`${siteOrigin}/resume/`,
		`${siteOrigin}/ko/resume/`,
	];
	for (const locale of ["en", "ko"] as const) {
		const localePrefix = locale === "ko" ? "/ko" : "";
		for (const post of collectPostEntries(root, locale)) {
			expected.push(`${siteOrigin}${localePrefix}/post/${post.slug}/`);
		}
	}

	const expectedSorted = [...expected].sort();
	const actualSorted = [...actual].sort();
	const same =
		expectedSorted.length === actualSorted.length &&
		expectedSorted.every((loc, i) => loc === actualSorted[i]);
	if (!same) {
		logError(
			"build-github",
			`Sitemap URL contract mismatch: expected ${expectedSorted.length} URLs, found ${actualSorted.length}`,
			{
				error: new Error(
					`sitemap mismatch: expected [${expectedSorted.join(", ")}] actual [${actualSorted.join(", ")}]`,
				),
			},
		);
		process.exit(1);
	}

	for (const alias of contract.urls) {
		if (alias.kind !== "alias") continue;
		const aliasedLoc = `${siteOrigin}${alias.url}`;
		if (actual.includes(aliasedLoc)) {
			logError(
				"build-github",
				`URL contract alias must be excluded from sitemap: ${aliasedLoc}`,
				{ error: new Error(`aliased sitemap loc: ${aliasedLoc}`) },
			);
			process.exit(1);
		}
	}
}

function buildRobots(dist: string) {
	const content =
		`User-agent: *\n` +
		`Allow: /\n` +
		`\n` +
		`User-agent: Google-Extended\n` +
		`Allow: /\n` +
		`\n` +
		`Sitemap: https://wintrover.github.io/sitemap.xml\n`;
	writeFile(path.join(dist, "robots.txt"), content);
}

function loadCategoryConfig(root: string) {
	const configPath = path.join(root, "src", "lib", "categories.json");
	const raw = fs.readFileSync(configPath, "utf-8");
	return JSON.parse(raw) as {
		categories?: Record<
			string,
			{
				name?: string;
				exclusiveTags?: string[];
			}
		>;
	};
}

function buildExclusiveTagRules(config: ReturnType<typeof loadCategoryConfig>) {
	const rules = new Map<string, string>();
	for (const entry of Object.values(config.categories || {})) {
		if (!entry?.exclusiveTags) continue;
		for (const tag of entry.exclusiveTags) {
			rules.set(String(tag).trim().toLowerCase(), String(entry.name || ""));
		}
	}
	return rules;
}

export function validatePostCategoryTagConsistency(root: string) {
	const config = loadCategoryConfig(root);
	const exclusiveRules = buildExclusiveTagRules(config);
	if (exclusiveRules.size === 0) return;

	const postsRoot = path.join(root, "src", "posts");
	if (!fs.existsSync(postsRoot)) return;

	const allFiles = walkMarkdownFiles(postsRoot).filter((p) => {
		const rel = path.relative(postsRoot, p).replaceAll("\\", "/");
		return !rel.toLowerCase().startsWith("ko/");
	});

	const violations: string[] = [];
	for (const filePath of allFiles) {
		const raw = fs.readFileSync(filePath, "utf-8");
		const { data } = parseFrontMatter(raw);
		const category = typeof data.category === "string" ? data.category : "";
		const tags = Array.isArray(data.tags)
			? data.tags.map(String)
			: typeof data.tags === "string"
				? data.tags
						.split(",")
						.map((t) => t.trim())
						.filter(Boolean)
				: [];

		for (const tag of tags) {
			const requiredCategory = exclusiveRules.get(tag.toLowerCase());
			if (requiredCategory && category !== requiredCategory) {
				violations.push(
					`${path.relative(root, filePath)}: exclusive tag "${tag}" requires category "${requiredCategory}", got "${category}"`,
				);
			}
		}
	}

	if (violations.length > 0) {
		for (const v of violations) {
			logError("build-github", `Category/tag consistency violation: ${v}`);
		}
		process.exit(1);
	}
}

export function renderLegacyLocaleAliasHtml(target = "/ko/"): string {
	const locale: UrlLocale = target.startsWith("/ko/") ? "ko" : "en";
	const canonical = `${siteOrigin}${target}`;
	const redirect = target;
	const title =
		locale === "ko"
			? "한국어 페이지로 이동"
			: "Redirecting to the English site";
	const openLabel =
		locale === "ko" ? "한국어 사이트 열기" : "Open the English site";
	return (
		`<!doctype html>` +
		`<html lang="${locale}">` +
		`<head>` +
		`<meta charset="utf-8"/>` +
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
		`<title>${xmlEscape(title)}</title>` +
		`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
		`<meta name="robots" content="noindex,follow"/>` +
		`<meta http-equiv="refresh" content="0; url=${redirect}"/>` +
		`</head>` +
		`<body>` +
		`<noscript><a href="${redirect}">${openLabel}</a></noscript>` +
		`</body>` +
		`</html>`
	);
}

export function renderLegacyPostAliasHtml(
	locale: UrlLocale,
	post: LegacyPostAliasTarget,
	finalTarget: string,
) {
	const destination = parsePostAliasUrl(finalTarget);
	if (!destination) {
		throw new Error(`invalid alias final target: ${finalTarget}`);
	}
	const localePrefix = locale === "ko" ? "/ko" : "";
	const canonical = `${siteOrigin}${finalTarget}`;
	const redirect = `${localePrefix}/#/post/${destination.slug}`;
	const title = post.title;
	const description = post.description || post.title;
	return (
		`<!doctype html>` +
		`<html lang="${locale}">` +
		`<head>` +
		`<meta charset="utf-8"/>` +
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
		`<title>${xmlEscape(title)}</title>` +
		`<meta name="description" content="${xmlEscape(description)}"/>` +
		`<meta name="robots" content="noindex,follow"/>` +
		`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
		`<meta property="og:title" content="${xmlEscape(title)}"/>` +
		`<meta property="og:type" content="article"/>` +
		`<meta property="og:url" content="${xmlEscape(canonical)}"/>` +
		`<meta property="og:image" content="${xmlEscape(defaultOgImage)}"/>` +
		`<meta property="og:site_name" content="Axiom"/>` +
		`<meta http-equiv="refresh" content="0; url=${redirect}"/>` +
		`<script>(()=>{location.replace(${JSON.stringify(redirect)});})();</script>` +
		`</head>` +
		`<body>` +
		`<noscript><a href="${xmlEscape(redirect)}">Open post</a></noscript>` +
		`</body>` +
		`</html>`
	);
}

function aliasPathSegments(url: string): string[] {
	return url.slice(1, -1).split("/").filter(Boolean);
}

function failUrlContract(message: string): never {
	logError("build-github", `URL contract invalid: ${message}`, {
		error: new Error(message),
	});
	process.exit(1);
}

export function loadUrlContract(root: string): UrlContract {
	const contractPath = path.join(root, URL_CONTRACT_FILE);
	if (!fs.existsSync(contractPath)) {
		failUrlContract(`${URL_CONTRACT_FILE} is missing at ${root}`);
	}
	try {
		return parseUrlContract(
			JSON.parse(fs.readFileSync(contractPath, "utf-8")) as unknown,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		failUrlContract(`${URL_CONTRACT_FILE}: ${message}`);
	}
}

export function validateUrlContractAliases(
	root: string,
	contract: UrlContract = loadUrlContract(root),
) {
	const violations = validateUrlContract(contract, deriveCanonicalUrls(root));
	if (violations.length === 0) return;
	for (const violation of violations) {
		logError("build-github", `URL contract invalid: ${violation}`, {
			error: new Error(violation),
		});
	}
	process.exit(1);
}

export function buildAliasPages(
	dist: string,
	root: string,
	contract: UrlContract = loadUrlContract(root),
) {
	const postsByLocale = new Map<
		UrlLocale,
		ReturnType<typeof collectPostEntries>
	>();
	const postsFor = (locale: UrlLocale) => {
		const cached = postsByLocale.get(locale);
		if (cached) return cached;
		const entries = collectPostEntries(root, locale);
		postsByLocale.set(locale, entries);
		return entries;
	};

	for (const alias of contract.urls) {
		if (alias.kind !== "alias") continue;
		const { final } = resolveAlias(contract, alias.url);
		const origin = parsePostAliasUrl(alias.url);
		const destination = parsePostAliasUrl(final);

		if (!origin && !destination) {
			if (final !== "/" && final !== "/ko/") {
				failUrlContract(`unsupported alias target: ${alias.url} -> ${final}`);
			}
			writeFile(
				path.join(dist, ...aliasPathSegments(alias.url), "index.html"),
				renderLegacyLocaleAliasHtml(final),
			);
			continue;
		}
		if (!origin || !destination) {
			failUrlContract(
				`alias mixes post and locale targets: ${alias.url} -> ${final}`,
			);
		}
		if (origin.locale !== destination.locale) {
			failUrlContract(`alias locale change: ${alias.url} -> ${final}`);
		}
		const post = postsFor(destination.locale).find(
			(entry) => entry.slug === destination.slug,
		);
		if (!post) {
			failUrlContract(`alias target post not found: ${final}`);
		}
		const localeDir = origin.locale === "ko" ? path.join(dist, "ko") : dist;
		writeFile(
			path.join(localeDir, "post", origin.slug, "index.html"),
			renderLegacyPostAliasHtml(origin.locale, post, final),
		);
		if (
			origin.locale === "en" &&
			fs.existsSync(path.join(dist, "ko", "post", origin.slug))
		) {
			failUrlContract(
				`alias must not exist in the Korean tree: ko/post/${origin.slug}`,
			);
		}
	}
}

export function verifyAliasOutputs(
	dist: string,
	root: string,
	contract: UrlContract = loadUrlContract(root),
) {
	const sitemapPath = path.join(dist, "sitemap.xml");
	const sitemapXml = fs.existsSync(sitemapPath)
		? fs.readFileSync(sitemapPath, "utf-8")
		: "";
	const violations: string[] = [];

	for (const alias of contract.urls) {
		if (alias.kind !== "alias") continue;
		const { final } = resolveAlias(contract, alias.url);
		const filePath = path.join(
			dist,
			...aliasPathSegments(alias.url),
			"index.html",
		);
		const relativePath = path.relative(dist, filePath).replaceAll("\\", "/");
		if (!fs.existsSync(filePath)) {
			violations.push(`missing alias output: ${relativePath}`);
			continue;
		}
		const html = fs.readFileSync(filePath, "utf-8");
		const canonical = `${siteOrigin}${final}`;
		if (!html.includes(`rel="canonical" href="${canonical}"`)) {
			violations.push(
				`alias canonical mismatch: ${relativePath} (expected ${canonical})`,
			);
		}
		const origin = parsePostAliasUrl(alias.url);
		const destination = parsePostAliasUrl(final);
		if (!html.includes('name="robots" content="noindex,follow"')) {
			violations.push(`alias robots mismatch: ${relativePath}`);
		}
		if (origin && destination) {
			const localePrefix = destination.locale === "ko" ? "/ko" : "";
			const redirect = `${localePrefix}/#/post/${destination.slug}`;
			if (!html.includes(`http-equiv="refresh" content="0; url=${redirect}"`)) {
				violations.push(
					`alias refresh mismatch: ${relativePath} (expected ${redirect})`,
				);
			}
			if (!html.includes(`location.replace(${JSON.stringify(redirect)})`)) {
				violations.push(
					`alias script redirect mismatch: ${relativePath} (expected ${redirect})`,
				);
			}
			if (
				destination.locale === "en" &&
				fs.existsSync(path.join(dist, "ko", "post", origin.slug))
			) {
				violations.push(
					`alias must not exist in Korean tree: ko/post/${origin.slug}`,
				);
			}
		} else if (
			!html.includes(`http-equiv="refresh" content="0; url=${final}"`)
		) {
			violations.push(
				`alias refresh mismatch: ${relativePath} (expected ${final})`,
			);
		}

		const aliasLoc = `${siteOrigin}${alias.url}`;
		if (sitemapXml.includes(`<loc>${aliasLoc}</loc>`)) {
			violations.push(`alias url present in sitemap: ${aliasLoc}`);
		}
	}

	if (violations.length === 0) return;
	for (const violation of violations) {
		logError("build-github", `Alias output violation: ${violation}`, {
			error: new Error(violation),
		});
	}
	process.exit(1);
}

function verifyBuildOutput(distPath: string, contract: UrlContract) {
	console.log("🚀 Verifying Axiom GitHub Pages build output...");
	const expectedFiles = [
		path.join(distPath, "index.html"),
		path.join(distPath, "ko", "index.html"),
		path.join(distPath, "ko", "resume", "index.html"),
		path.join(distPath, "resume", "index.html"),
		...contract.urls
			.filter((entry) => entry.kind === "alias")
			.map((entry) =>
				path.join(distPath, ...aliasPathSegments(entry.url), "index.html"),
			),
	];

	if (!fs.existsSync(distPath)) {
		logError(
			"build-github",
			"Build output not found: dist directory does not exist",
			{
				error: new Error("dist directory does not exist"),
			},
		);
		console.log("Please run: npm run build:github");
		process.exit(1);
	}

	for (const filePath of expectedFiles) {
		if (fs.existsSync(filePath)) continue;
		const relative = path.relative(distPath, filePath).replaceAll("\\", "/");
		logError("build-github", `Build output invalid: ${relative} not found`, {
			error: new Error(`${relative} not found in dist`),
		});
		process.exit(1);
	}

	console.log("✅ Build verification successful");
	console.log("📦 Axiom build is ready for GitHub Pages deployment!");
}

function listSubdirectories(target: string): string[] {
	if (!fs.existsSync(target)) return [];
	return fs
		.readdirSync(target, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

function listRelativeFiles(target: string): string[] {
	const results: string[] = [];
	if (!fs.existsSync(target)) return results;
	const stack: string[] = [target];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (entry.isFile()) {
				results.push(path.relative(target, full).replaceAll("\\", "/"));
			}
		}
	}
	return results.sort();
}

function hasSameValues(actual: string[], expected: string[]): boolean {
	const actualSet = new Set(actual);
	const expectedSet = new Set(expected);
	return (
		actualSet.size === expectedSet.size &&
		[...actualSet].every((value) => expectedSet.has(value))
	);
}

function describeSetMismatch(actual: string[], expected: string[]): string {
	const actualSet = new Set(actual);
	const expectedSet = new Set(expected);
	const missing = expected.filter((value) => !actualSet.has(value));
	const unexpected = actual.filter((value) => !expectedSet.has(value));
	return `missing: [${missing.join(", ")}], unexpected: [${unexpected.join(", ")}]`;
}

export function findLocaleBoundaryViolations(
	dist: string,
	root: string,
	contract: UrlContract = loadUrlContract(root),
): string[] {
	const violations: string[] = [];

	const koSlugs = new Set(
		collectPostEntries(root, "ko").map((entry) => entry.slug),
	);
	for (const alias of contract.urls) {
		if (alias.kind !== "alias") continue;
		const origin = parsePostAliasUrl(alias.url);
		if (origin?.locale === "ko") koSlugs.add(origin.slug);
	}
	const koPostDirs = listSubdirectories(path.join(dist, "ko", "post"));
	const expectedKoDirs = [...koSlugs].sort();
	if (!hasSameValues(koPostDirs, expectedKoDirs)) {
		violations.push(
			`dist/ko/post directory set mismatch (${describeSetMismatch(koPostDirs, expectedKoDirs)})`,
		);
	}

	const enSlugs = new Set(
		collectPostEntries(root, "en").map((entry) => entry.slug),
	);
	for (const alias of contract.urls) {
		if (alias.kind !== "alias") continue;
		const origin = parsePostAliasUrl(alias.url);
		if (origin?.locale === "en") enSlugs.add(origin.slug);
	}
	const enPostDirs = listSubdirectories(path.join(dist, "post"));
	const expectedEnDirs = [...enSlugs].sort();
	if (!hasSameValues(enPostDirs, expectedEnDirs)) {
		violations.push(
			`dist/post directory set mismatch (${describeSetMismatch(enPostDirs, expectedEnDirs)})`,
		);
	}

	const derivedAssets = deriveKoPublicAssets(root);
	const actualAssets = listRelativeFiles(path.join(dist, "ko", "images")).map(
		(relativePath) => `images/${relativePath}`,
	);
	if (!hasSameValues(actualAssets, derivedAssets)) {
		violations.push(
			`dist/ko/images asset set mismatch (${describeSetMismatch(actualAssets, derivedAssets)})`,
		);
	}

	const forbiddenPaths = [
		"evidence",
		"404.html",
		".nojekyll",
		"auto-merge-verification.txt",
		"kr",
		"sitemap.xml",
		"robots.txt",
	];
	for (const relativePath of forbiddenPaths) {
		if (!fs.existsSync(path.join(dist, "ko", relativePath))) continue;
		violations.push(`forbidden in Korean tree: ko/${relativePath}`);
	}

	const requiredPaths = [
		"index.html",
		"ko/index.html",
		"ko/resume/index.html",
		"resume/index.html",
		"404.html",
		".nojekyll",
		"evidence",
		"images/profile.png",
		"ko/images/profile.png",
		...contract.urls
			.filter((entry) => entry.kind === "alias")
			.map((entry) => `${aliasPathSegments(entry.url).join("/")}/index.html`),
	];
	for (const relativePath of requiredPaths) {
		const absolutePath = path.join(dist, ...relativePath.split("/"));
		if (fs.existsSync(absolutePath)) continue;
		violations.push(`missing required build output: ${relativePath}`);
	}

	return violations;
}

export function verifyLocaleBoundary(
	dist: string,
	root: string,
	contract: UrlContract = loadUrlContract(root),
) {
	const violations = findLocaleBoundaryViolations(dist, root, contract);
	if (violations.length === 0) return;
	for (const violation of violations) {
		logError("build-github", `Locale boundary violation: ${violation}`, {
			error: new Error(violation),
		});
	}
	process.exit(1);
}

export function main() {
	const root = process.cwd();
	const contract = loadUrlContract(root);
	validateUrlContractAliases(root, contract);
	validatePostCategoryTagConsistency(root);
	const dist = path.join(root, "dist");

	rm(dist);
	mk(dist);

	buildBlog(dist, "en");
	buildBlog(dist, "ko");
	copyKoPublicAssets(root, dist);
	buildResumeLandingPage(dist, "ko");
	buildResumeLandingPage(dist, "en");
	buildPostLandingPages(dist, "ko");
	buildPostLandingPages(dist, "en");
	buildAliasPages(dist, root, contract);
	buildSitemap(dist);
	verifyPostLandingPages(dist, root);
	verifySitemapContract(dist, root, contract);
	buildRobots(dist);
	verifyAliasOutputs(dist, root, contract);
	verifyLocaleBoundary(dist, root, contract);
	verifyBuildOutput(dist, contract);
}

if (process.argv[1] && path.basename(process.argv[1]) === "build-github.ts") {
	main();
}
