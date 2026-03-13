import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { logError } from "../src/lib/log";
import { parseFrontMatter, slugify } from "../src/lib/utils";

type Env = Record<string, string | undefined>;

const siteOrigin = "https://wintrover.github.io";
const defaultOgImage = `${siteOrigin}/images/profile.png`;

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

function buildBlog(dist: string, locale: "ko" | "en") {
	const basePath = `/${locale}/`;
	const metaDescription =
		locale === "ko"
			? "wintrover의 프로덕트 개발 블로그와 이력서. AI/LLM, 컴퓨터 비전, 프로덕트 엔지니어링 기록."
			: "wintrover's blog and resume. Notes on building products with AI/LLM and computer vision.";
	const ogTitle =
		locale === "ko"
			? "wintrover - Product Engineer & Builder"
			: "wintrover - Product Engineer & Builder";
	const ogDescription = metaDescription;
	const ogImageAlt =
		locale === "ko" ? "wintrover 프로필 이미지" : "wintrover profile image";
	run(process.execPath, ["./node_modules/vite/bin/vite.js", "build"], {
		VITE_BASE_PATH: basePath,
		VITE_OUT_DIR: path.join(dist, locale),
		VITE_LOCALE: locale,
		VITE_HTML_LANG: locale,
		VITE_META_DESCRIPTION: metaDescription,
		VITE_OG_TITLE: ogTitle,
		VITE_OG_DESCRIPTION: ogDescription,
		VITE_OG_IMAGE_ALT: ogImageAlt,
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

function walkMarkdownFiles(rootDir: string) {
	const results: string[] = [];
	const stack: string[] = [rootDir];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) continue;
		const entries = fs.readdirSync(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
				results.push(full);
			}
		}
	}
	return results;
}

function toLastMod(value: unknown) {
	if (typeof value !== "string") return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
}

function collectPostEntries(root: string, locale: "ko" | "en") {
	const postsRoot = path.join(root, "src", "posts");
	const koRoot = path.join(postsRoot, "ko");
	const files =
		locale === "ko"
			? fs.existsSync(koRoot)
				? walkMarkdownFiles(koRoot)
				: []
			: fs.existsSync(postsRoot)
				? walkMarkdownFiles(postsRoot).filter((p) => {
						const rel = path.relative(postsRoot, p).replaceAll("\\", "/");
						return !rel.toLowerCase().startsWith("ko/");
					})
				: [];

	const entries: {
		slug: string;
		lastmod: string | null;
		title: string;
		description: string;
		date: string | null;
	}[] = [];
	for (const filePath of files) {
		const fileName = path.basename(filePath, ".md");
		const raw = fs.readFileSync(filePath, "utf8");
		const { data } = parseFrontMatter(raw);
		const title =
			typeof (data as any)?.title === "string" ? (data as any).title : "";
		const slug = slugify(title || fileName || "");
		if (!slug) continue;
		const dateRaw =
			typeof (data as any)?.date === "string" ? (data as any).date : null;
		const lastmod = toLastMod(dateRaw);
		const excerpt =
			typeof (data as any)?.excerpt === "string"
				? (data as any).excerpt
				: typeof (data as any)?.description === "string"
					? (data as any).description
					: "";
		entries.push({
			slug,
			lastmod,
			title: title || fileName,
			description: excerpt || title || fileName,
			date: dateRaw,
		});
	}
	return entries;
}

function buildResumeLandingPage(dist: string, locale: "ko" | "en") {
	const localeDir = path.join(dist, locale);
	const resumeLocalePath = path.join(
		process.cwd(),
		"src",
		"lib",
		"resume",
		"locales",
		`${locale}.json`,
	);
	const raw = fs.readFileSync(resumeLocalePath, "utf8");
	const json = JSON.parse(raw) as any;
	const title = String(json?.meta?.title ?? "wintrover's resume");
	const description = String(
		json?.meta?.description ??
			"Product engineer & builder shipping AI-powered products. Portfolio and project notes.",
	);
	const canonical = `${siteOrigin}/${locale}/resume/`;
	const redirect = `/${locale}/#/resume`;
	const ogTitle = String(json?.meta?.og_title ?? title);
	const ogDescription = String(json?.meta?.og_description ?? description);
	const ogType = String(json?.meta?.og_type ?? "website");
	const ogImageAlt =
		locale === "ko" ? "wintrover 프로필 이미지" : "wintrover profile image";

	const html =
		`<!doctype html>` +
		`<html lang="${xmlEscape(locale)}" prefix="og: https://ogp.me/ns#">` +
		`<head>` +
		`<meta charset="utf-8"/>` +
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
		`<title>${xmlEscape(title)}</title>` +
		`<meta name="description" content="${xmlEscape(description)}"/>` +
		`<meta name="robots" content="index,follow"/>` +
		`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
		`<link rel="alternate" hreflang="ko" href="${siteOrigin}/ko/resume/"/>` +
		`<link rel="alternate" hreflang="en" href="${siteOrigin}/en/resume/"/>` +
		`<link rel="alternate" hreflang="x-default" href="${siteOrigin}/"/>` +
		`<meta property="og:title" content="${xmlEscape(ogTitle)}"/>` +
		`<meta property="og:description" content="${xmlEscape(ogDescription)}"/>` +
		`<meta property="og:type" content="${xmlEscape(ogType)}"/>` +
		`<meta property="og:url" content="${xmlEscape(canonical)}"/>` +
		`<meta property="og:image" content="${xmlEscape(defaultOgImage)}"/>` +
		`<meta property="og:image:alt" content="${xmlEscape(ogImageAlt)}"/>` +
		`<meta property="og:site_name" content="wintrover"/>` +
		`<script>(()=>{location.replace(${JSON.stringify(redirect)});})();</script>` +
		`</head>` +
		`<body>` +
		`<noscript><a href="${xmlEscape(redirect)}">Open resume</a></noscript>` +
		`</body>` +
		`</html>`;

	writeFile(path.join(localeDir, "resume", "index.html"), html);
}

function buildPostLandingPages(dist: string, locale: "ko" | "en") {
	const root = process.cwd();
	const localeDir = path.join(dist, locale);
	const posts = collectPostEntries(root, locale);
	for (const post of posts) {
		const canonical = `${siteOrigin}/${locale}/post/${post.slug}/`;
		const redirect = `/${locale}/#/post/${post.slug}`;
		const title = `${post.title} - wintrover`;
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

		const html =
			`<!doctype html>` +
			`<html lang="${xmlEscape(locale)}" prefix="og: https://ogp.me/ns#">` +
			`<head>` +
			`<meta charset="utf-8"/>` +
			`<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
			`<title>${xmlEscape(title)}</title>` +
			`<meta name="description" content="${xmlEscape(description)}"/>` +
			`<meta name="robots" content="index,follow"/>` +
			`<link rel="canonical" href="${xmlEscape(canonical)}"/>` +
			`<meta property="og:title" content="${xmlEscape(post.title)}"/>` +
			`<meta property="og:description" content="${xmlEscape(description)}"/>` +
			`<meta property="og:type" content="article"/>` +
			`<meta property="og:url" content="${xmlEscape(canonical)}"/>` +
			`<meta property="og:image" content="${xmlEscape(defaultOgImage)}"/>` +
			`<meta property="og:image:alt" content="${xmlEscape(post.title)}"/>` +
			`<meta property="og:site_name" content="wintrover"/>` +
			`<script type="application/ld+json">${jsonLdString}</script>` +
			`<script>(()=>{location.replace(${JSON.stringify(redirect)});})();</script>` +
			`</head>` +
			`<body>` +
			`<noscript><a href="${xmlEscape(redirect)}">Open post</a></noscript>` +
			`</body>` +
			`</html>`;

		writeFile(path.join(localeDir, "post", post.slug, "index.html"), html);
	}
}

function buildSitemap(dist: string) {
	const root = process.cwd();
	const base = siteOrigin;
	const urls: { loc: string; lastmod?: string }[] = [];

	urls.push({ loc: `${base}/` });
	urls.push({ loc: `${base}/ko/` });
	urls.push({ loc: `${base}/en/` });
	urls.push({ loc: `${base}/ko/resume/` });
	urls.push({ loc: `${base}/en/resume/` });

	for (const locale of ["ko", "en"] as const) {
		const posts = collectPostEntries(root, locale);
		for (const post of posts) {
			const loc = `${base}/${locale}/post/${post.slug}/`;
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

function buildRobots(dist: string) {
	const content =
		`User-agent: *\n` +
		`Allow: /\n` +
		`Sitemap: https://wintrover.github.io/sitemap.xml\n`;
	writeFile(path.join(dist, "robots.txt"), content);
}

function verifyBuildOutput(distPath: string) {
	console.log("🚀 Verifying GitHub Pages build output...");
	const expectedFiles = [
		path.join(distPath, "index.html"),
		path.join(distPath, "ko", "index.html"),
		path.join(distPath, "en", "index.html"),
		path.join(distPath, "ko", "resume", "index.html"),
		path.join(distPath, "en", "resume", "index.html"),
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
	console.log("📦 Ready for GitHub Pages deployment!");
}

function main() {
	const root = process.cwd();
	const dist = path.join(root, "dist");

	rm(dist);
	mk(dist);

	const publicDir = path.join(root, "public");
	if (fs.existsSync(publicDir)) {
		fs.cpSync(publicDir, dist, { recursive: true });
	}

	const selectorHtml =
		'<!doctype html><html lang="en" prefix="og: https://ogp.me/ns#"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>wintrover</title><meta name="description" content="wintrover&#39;s blog and resume. Notes on building products with AI/LLM and computer vision."/><meta name="robots" content="index,follow"/><link rel="canonical" href="https://wintrover.github.io/"/><link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/"/><link rel="alternate" hreflang="en" href="https://wintrover.github.io/en/"/><link rel="alternate" hreflang="x-default" href="https://wintrover.github.io/"/><meta property="og:title" content="wintrover - Product Engineer & Builder"/><meta property="og:description" content="wintrover&#39;s blog and resume. Notes on building products with AI/LLM and computer vision."/><meta property="og:type" content="website"/><meta property="og:url" content="https://wintrover.github.io/"/><meta property="og:image" content="https://wintrover.github.io/images/profile.png"/><meta property="og:image:alt" content="wintrover profile image"/><meta property="og:site_name" content="wintrover"/><script>(()=>{const lang=(navigator.language||"").toLowerCase().startsWith("ko")?"ko":"en";location.replace("/"+lang+"/");})();</script></head><body><noscript><a href="/ko/" lang="ko">한국어</a> <a href="/en/" lang="en">English</a></noscript></body></html>';
	writeFile(path.join(dist, "index.html"), selectorHtml);

	buildBlog(dist, "ko");
	buildBlog(dist, "en");
	buildResumeLandingPage(dist, "ko");
	buildResumeLandingPage(dist, "en");
	buildPostLandingPages(dist, "ko");
	buildPostLandingPages(dist, "en");
	buildSitemap(dist);
	buildRobots(dist);
	verifyBuildOutput(dist);
}

main();
