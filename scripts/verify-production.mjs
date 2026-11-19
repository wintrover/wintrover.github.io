#!/usr/bin/env node
/**
 * Production acceptance gate for https://wintrover.github.io.
 *
 * Asset correctness is observed through real browser requests. This tool must
 * never call the build's public-asset allowlist helper: the allowlist is not
 * evidence that the deployed Korean tree serves the assets its posts request.
 *
 * This is a manual post-deploy gate, not a CI or pre-commit check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PRODUCTION_ORIGIN = "https://wintrover.github.io";
export const REQUEST_TIMEOUT_MS = 30_000;
export const BROWSER_TIMEOUT_MS = 45_000;
/**
 * Informational only: the source-derived set currently has 62 entries. Sitemap
 * acceptance is multiset equality against the expectation, never this count.
 */
export const EXPECTED_SITEMAP_LOC_COUNT = 62;
export const URL_CONTRACT_FILENAME = "url-contract.json";
export const UNKNOWN_PATH = "/definitely-not-a-real-path-xyz/";
export const AXIOM_REPOSITORY_URL = "https://github.com/Archright/Axiom";
export const NOT_FOUND_TITLES = {
	en: "Page not found",
	ko: "페이지를 찾을 수 없습니다",
};

export const FORBIDDEN_KO_PATHS = [
	"/ko/evidence/",
	"/ko/404.html",
	"/ko/.nojekyll",
	"/ko/auto-merge-verification.txt",
	"/ko/sitemap.xml",
	"/ko/robots.txt",
];

export const REQUIRED_ROOT_PATHS = [
	"/evidence/p0d2g/README.md",
	"/404.html",
	"/.nojekyll",
	"/auto-merge-verification.txt",
	"/images/profile.png",
	"/kr/",
];

/**
 * @param {"en" | "ko"} locale
 * @returns {string}
 */
function localePrefix(locale) {
	if (locale === "ko") return "/ko";
	if (locale === "en") return "";
	throw new Error(`unsupported locale: ${locale}`);
}

/**
 * @param {"en" | "ko"} locale
 * @param {string} slug
 * @returns {string}
 */
export function postLandingPath(locale, slug) {
	return `${localePrefix(locale)}/post/${slug}/`;
}

/**
 * @param {"en" | "ko"} locale
 * @param {string} slug
 * @returns {string}
 */
export function postCanonicalUrl(locale, slug) {
	return `${PRODUCTION_ORIGIN}${postLandingPath(locale, slug)}`;
}

/**
 * @param {"en" | "ko"} locale
 * @param {string} slug
 * @returns {string}
 */
export function postHashTarget(locale, slug) {
	return `${localePrefix(locale)}/#/post/${slug}`;
}

/**
 * The hash fragment the SPA ends on. It is locale-independent: the Korean
 * landing redirects to `/ko/#/post/<slug>`, so `location.hash` is `#/post/<slug>`.
 *
 * @param {string} slug
 * @returns {string}
 */
export function postHashFragment(slug) {
	return `#/post/${slug}`;
}

/**
 * @param {"en" | "ko"} locale
 * @param {string} categorySlug
 * @returns {string}
 */
export function categoryHashTarget(locale, categorySlug) {
	return `${localePrefix(locale)}/#/category/${categorySlug}`;
}

/**
 * @param {"en" | "ko"} locale
 * @param {string} categorySlug
 * @param {string} tagSlug
 * @returns {string}
 */
export function categoryTagHashTarget(locale, categorySlug, tagSlug) {
	return `${categoryHashTarget(locale, categorySlug)}/tag/${tagSlug}`;
}

/**
 * Mirrors `slugify` in src/lib/utils.ts. Category and tag hash segments are
 * produced by that function, so samples must use the same normalization.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugifyUrlSegment(value) {
	const tokens = String(value ?? "")
		.toLowerCase()
		.match(/[a-z0-9_]+/g);
	return tokens ? tokens.join("-") : "";
}

/**
 * Picks one category/tag pair that actually exists in source frontmatter.
 * Selection is deterministic: first entry by slug with a non-empty category
 * slug and tag slug, then first tag by slug.
 *
 * @param {{ slug: string, category?: unknown, tags?: unknown }[]} entries
 * @returns {{ category: string, categorySlug: string, tag: string, tagSlug: string } | null}
 */
export function pickCategoryTagSample(entries) {
	const sorted = [...entries].sort((left, right) =>
		String(left.slug) < String(right.slug)
			? -1
			: String(left.slug) > String(right.slug)
				? 1
				: 0,
	);
	for (const entry of sorted) {
		const category =
			typeof entry.category === "string" ? entry.category.trim() : "";
		const categorySlug = slugifyUrlSegment(category);
		if (!category || !categorySlug) continue;
		const tags = Array.isArray(entry.tags) ? entry.tags : [];
		const tagCandidates = tags
			.map((tag) => (typeof tag === "string" ? tag.trim() : ""))
			.filter(Boolean)
			.map((tag) => ({ tag, tagSlug: slugifyUrlSegment(tag) }))
			.filter((candidate) => candidate.tagSlug)
			.sort((left, right) =>
				left.tagSlug < right.tagSlug
					? -1
					: left.tagSlug > right.tagSlug
						? 1
						: 0,
			);
		if (tagCandidates.length === 0) continue;
		return {
			category,
			categorySlug,
			tag: tagCandidates[0].tag,
			tagSlug: tagCandidates[0].tagSlug,
		};
	}
	return null;
}

/**
 * @param {{ koSlugs: string[], enSlugs: string[] }} input
 * @returns {string[]}
 */
export function expectedSitemapLocs({ koSlugs, enSlugs }) {
	const locs = [
		`${PRODUCTION_ORIGIN}/`,
		`${PRODUCTION_ORIGIN}/ko/`,
		`${PRODUCTION_ORIGIN}/resume/`,
		`${PRODUCTION_ORIGIN}/ko/resume/`,
	];
	for (const slug of koSlugs) locs.push(postCanonicalUrl("ko", slug));
	for (const slug of enSlugs) locs.push(postCanonicalUrl("en", slug));
	return locs;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function decodeXmlText(value) {
	return String(value)
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

/**
 * @param {string} xml
 * @returns {string[]}
 */
export function extractSitemapLocs(xml) {
	return [...String(xml).matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) =>
		decodeXmlText(match[1].trim()),
	);
}

/**
 * @param {string[]} values
 * @returns {Map<string, number>}
 */
function countValues(values) {
	const counts = new Map();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return counts;
}

/**
 * @param {Map<string, number>} counts
 * @returns {string[]}
 */
function duplicateValues(counts) {
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([value]) => value)
		.sort();
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @returns {{ ok: boolean, actualCount: number, expectedCount: number, missing: string[], unexpected: string[], duplicateActual: string[], duplicateExpected: string[] }}
 */
export function compareUrlMultisets(actual, expected) {
	const actualCounts = countValues(actual);
	const expectedCounts = countValues(expected);
	const missing = [];
	const unexpected = [];
	for (const [value, count] of expectedCounts) {
		const delta = count - (actualCounts.get(value) ?? 0);
		for (let index = 0; index < delta; index += 1) missing.push(value);
	}
	for (const [value, count] of actualCounts) {
		const delta = count - (expectedCounts.get(value) ?? 0);
		for (let index = 0; index < delta; index += 1) unexpected.push(value);
	}
	return {
		ok: missing.length === 0 && unexpected.length === 0,
		actualCount: actual.length,
		expectedCount: expected.length,
		missing: missing.sort(),
		unexpected: unexpected.sort(),
		duplicateActual: duplicateValues(actualCounts),
		duplicateExpected: duplicateValues(expectedCounts),
	};
}

/**
 * @param {{ localLocs: string[] | null, sourceLocs: string[] }} input
 * @returns {{ locs: string[], source: "dist" | "source" }}
 */
export function resolveSitemapExpectation({ localLocs, sourceLocs }) {
	if (Array.isArray(localLocs)) {
		return { locs: [...localLocs], source: "dist" };
	}
	return { locs: [...sourceLocs], source: "source" };
}

/**
 * Expectation priority: url-contract.json, then a local dist sitemap, then the
 * source-derived canonical set. Contract and source values are root-relative;
 * a dist sitemap is normalized by the caller.
 *
 * @param {{ contractLocs: string[] | null, localLocs: string[] | null, sourceLocs: string[] }} input
 * @returns {{ locs: string[], source: "url-contract" | "dist" | "source" }}
 */
export function resolveSitemapPlan({ contractLocs, localLocs, sourceLocs }) {
	if (Array.isArray(contractLocs)) {
		return { locs: [...contractLocs], source: "url-contract" };
	}
	return resolveSitemapExpectation({ localLocs, sourceLocs });
}

/**
 * @param {string[]} paths
 * @param {string[]} aliases
 * @returns {string[]}
 */
export function findAliasEntries(paths, aliases) {
	const variants = new Set();
	for (const alias of aliases) {
		if (!alias) continue;
		variants.add(alias);
		if (alias.endsWith("/")) {
			variants.add(alias.slice(0, -1));
		} else {
			variants.add(`${alias}/`);
		}
	}
	return paths.filter((pathValue) => variants.has(pathValue)).sort();
}

/**
 * Parses `url-contract.json`. Accepted shapes:
 *   - `["https://wintrover.github.io/", ...]`
 *   - `{ "canonical": ["/", "/ko/"], "aliases": [{ "from": "/post/old/", "to": "/post/new/" }] }`
 *   - `{ "urls": [...] }` as an alias for `canonical`
 *
 * Canonical URLs are reduced to root-relative paths. Alias `from` values are
 * either explicit paths/URLs or bare post slugs (interpreted as `/post/<slug>/`).
 *
 * @param {unknown} raw
 * @param {string} [origin]
 * @returns {{ canonical: string[], aliases: { from: string, to: string | null }[] }}
 */
export function parseUrlContract(raw, origin = PRODUCTION_ORIGIN) {
	const input = typeof raw === "string" ? JSON.parse(raw) : raw;
	if (input === null || typeof input !== "object") {
		throw new Error(
			"url-contract.json: top-level value must be an object or array",
		);
	}
	const canonicalInput = Array.isArray(input)
		? input
		: (input.canonical ?? input.urls);
	if (!Array.isArray(canonicalInput)) {
		throw new Error("url-contract.json: canonical URL array is missing");
	}
	const canonical = canonicalInput.map((entry) => {
		let value = null;
		if (typeof entry === "string") {
			value = entry;
		} else if (entry !== null && typeof entry === "object") {
			value = entry.url ?? entry.loc ?? entry.canonical ?? null;
		}
		if (typeof value !== "string" || value.trim() === "") {
			throw new Error(
				`url-contract.json: invalid canonical entry ${JSON.stringify(entry)}`,
			);
		}
		return normalizeLocation(value.trim(), origin);
	});
	const aliasesInput = Array.isArray(input) ? [] : (input.aliases ?? []);
	if (!Array.isArray(aliasesInput)) {
		throw new Error("url-contract.json: aliases must be an array");
	}
	const aliases = aliasesInput.map((entry) =>
		normalizeContractAlias(entry, origin),
	);
	return { canonical, aliases };
}

/**
 * @param {unknown} entry
 * @param {string} origin
 * @returns {{ from: string, to: string | null }}
 */
function normalizeContractAlias(entry, origin) {
	if (typeof entry === "string") {
		return { from: aliasPath(entry, origin), to: null };
	}
	if (entry === null || typeof entry !== "object") {
		throw new Error(
			`url-contract.json: invalid alias entry ${JSON.stringify(entry)}`,
		);
	}
	const fromRaw = entry.from ?? entry.url ?? entry.path;
	if (typeof fromRaw !== "string" || fromRaw.trim() === "") {
		throw new Error(
			`url-contract.json: invalid alias entry ${JSON.stringify(entry)}`,
		);
	}
	const toRaw = entry.to ?? null;
	if (toRaw !== null && typeof toRaw !== "string") {
		throw new Error(
			`url-contract.json: invalid alias target ${JSON.stringify(entry)}`,
		);
	}
	return {
		from: aliasPath(fromRaw.trim(), origin),
		to: toRaw ? aliasPath(toRaw.trim(), origin) : null,
	};
}

/**
 * @param {string} value
 * @param {string} origin
 * @returns {string}
 */
function aliasPath(value, origin) {
	if (value.startsWith("/") || /^https?:\/\//i.test(value)) {
		return normalizeLocation(value, origin);
	}
	return `/post/${value}/`;
}

/**
 * @param {string | null | undefined} location
 * @param {string} [origin]
 * @returns {string}
 */
export function normalizeLocation(location, origin = PRODUCTION_ORIGIN) {
	if (!location) return "";
	try {
		const url = new URL(location, origin);
		if (url.origin !== origin) return location;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return location;
	}
}

/**
 * @param {string} html
 * @param {string} tagName
 * @returns {string[]}
 */
function extractTags(html, tagName) {
	return String(html).match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

/**
 * @param {string} tag
 * @param {string} name
 * @returns {string | null}
 */
function getAttribute(tag, name) {
	const match = tag.match(
		new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
	);
	if (!match) return null;
	return match[2] ?? match[3] ?? "";
}

/**
 * @param {string} html
 * @returns {string | null}
 */
export function extractHtmlLang(html) {
	const match = String(html).match(
		/<html\b[^>]*\blang\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i,
	);
	if (!match) return null;
	return match[2] ?? match[3] ?? match[4] ?? "";
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractCanonicalHrefs(html) {
	return extractTags(html, "link")
		.filter((tag) =>
			(getAttribute(tag, "rel") ?? "")
				.toLowerCase()
				.split(/\s+/)
				.includes("canonical"),
		)
		.map((tag) => getAttribute(tag, "href"))
		.filter((href) => href !== null);
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractReplaceTargets(html) {
	const targets = [];
	const pattern = /location\.replace\(\s*(?:"([^"]*)"|'([^']*)')\s*\)/g;
	for (const match of String(html).matchAll(pattern)) {
		targets.push(match[1] ?? match[2] ?? "");
	}
	return targets;
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractMetaRefreshTargets(html) {
	const targets = [];
	for (const tag of extractTags(html, "meta")) {
		if ((getAttribute(tag, "http-equiv") ?? "").toLowerCase() !== "refresh") {
			continue;
		}
		const content = getAttribute(tag, "content") ?? "";
		const match = content.match(/url\s*=\s*([^;]+)/i);
		if (!match) continue;
		targets.push(match[1].trim().replace(/^["']|["']$/g, ""));
	}
	return targets;
}

/**
 * Raw `content` values of `<meta http-equiv="refresh">` tags, so a check can
 * assert the exact `0; url=/ko/` string rather than only its URL part.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function extractMetaRefreshContents(html) {
	const contents = [];
	for (const tag of extractTags(html, "meta")) {
		if ((getAttribute(tag, "http-equiv") ?? "").toLowerCase() !== "refresh") {
			continue;
		}
		contents.push((getAttribute(tag, "content") ?? "").trim());
	}
	return contents;
}

/**
 * @param {string} content
 * @returns {boolean}
 */
export function isZeroSecondRefreshContent(content) {
	return /^\s*0\s*;\s*url\s*=\s*["']?[^"']+["']?\s*$/i.test(content);
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractRobotsContents(html) {
	const contents = [];
	for (const tag of extractTags(html, "meta")) {
		if ((getAttribute(tag, "name") ?? "").toLowerCase() !== "robots") continue;
		contents.push((getAttribute(tag, "content") ?? "").toLowerCase());
	}
	return contents;
}

/**
 * @param {string[]} contents
 * @returns {string[]}
 */
function robotsTokens(contents) {
	return contents.flatMap((content) =>
		content
			.split(/[\s,]+/)
			.map((directive) => directive.trim())
			.filter(Boolean),
	);
}

/**
 * None of the robots directives may be `noindex`.
 *
 * @param {string[]} contents
 * @returns {boolean}
 */
export function robotsAllowsIndexing(contents) {
	return !robotsTokens(contents).includes("noindex");
}

/**
 * @param {string[]} contents
 * @returns {boolean}
 */
export function robotsBlocksIndexing(contents) {
	return robotsTokens(contents).includes("noindex");
}

/**
 * `/kr/` is a static alias document: 200, exactly one canonical pointing at
 * `/ko/`, exactly one `0; url=/ko/` refresh, and `noindex` in robots.
 *
 * @param {{ status: number, html: string }} input
 * @returns {string[]}
 */
export function evaluateKrAliasDocument({ status, html }) {
	const expectedCanonical = `${PRODUCTION_ORIGIN}/ko/`;
	const problems = [];
	if (status !== 200) problems.push(`status=${status} expected=200`);
	const canonicals = extractCanonicalHrefs(html);
	if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
		problems.push(
			`canonical=${JSON.stringify(canonicals)} expected=${JSON.stringify([expectedCanonical])}`,
		);
	}
	const refreshContents = extractMetaRefreshContents(html);
	if (
		refreshContents.length !== 1 ||
		!isZeroSecondRefreshContent(refreshContents[0]) ||
		extractMetaRefreshTargets(html)[0] !== "/ko/"
	) {
		problems.push(
			`refresh=${JSON.stringify(refreshContents)} expected=${JSON.stringify(["0; url=/ko/"])}`,
		);
	}
	const robots = extractRobotsContents(html);
	if (!robotsBlocksIndexing(robots)) {
		problems.push(
			`robots=${JSON.stringify(robots)} expected noindex directive`,
		);
	}
	return problems;
}

/**
 * Step 1 of the 404 contract: the first unknown-path response itself.
 *
 * @param {{ status: number, html: string, location: string | null }} input
 * @returns {string[]}
 */
export function evaluateInitialNotFoundResponse({ status, html, location }) {
	const problems = [];
	if (status !== 404) problems.push(`status=${status} expected=404`);
	const robots = extractRobotsContents(html);
	const tokens = robotsTokens(robots);
	if (!tokens.includes("noindex") || !tokens.includes("nofollow")) {
		problems.push(`robots=${JSON.stringify(robots)} expected noindex,nofollow`);
	}
	const canonicals = extractCanonicalHrefs(html);
	if (canonicals.length > 0) {
		problems.push(`canonical=${JSON.stringify(canonicals)} expected none`);
	}
	if (location !== null && location !== "") {
		problems.push(`location=${JSON.stringify(location)} expected none`);
	}
	return problems;
}

/**
 * Step 3 of the 404 contract: the SPA NotFound document that the browser
 * actually renders after the hash redirect.
 *
 * @param {{ locale: "en" | "ko", canonicals: string[], documentTitle: string, robots: string[], jsonLdCount: number }} input
 * @returns {string[]}
 */
export function evaluateSpaNotFoundDocument({
	locale,
	canonicals,
	documentTitle,
	robots,
	jsonLdCount,
}) {
	const problems = [];
	const expectedCanonical = `${PRODUCTION_ORIGIN}${localePrefix(locale)}/`;
	const expectedTitle = NOT_FOUND_TITLES[locale];
	if (documentTitle !== expectedTitle) {
		problems.push(
			`document.title=${JSON.stringify(documentTitle)} expected=${JSON.stringify(expectedTitle)}`,
		);
	}
	if (canonicals.length !== 1) {
		problems.push(`canonical count=${canonicals.length} (expected 1)`);
	} else if (canonicals[0] !== expectedCanonical) {
		problems.push(
			`canonical=${JSON.stringify(canonicals[0])} expected=${JSON.stringify(expectedCanonical)}`,
		);
	}
	if (!robotsAllowsIndexing(robots)) {
		problems.push(
			`robots=${JSON.stringify(robots)} expected index,follow without noindex`,
		);
	} else if (!robotsTokens(robots).includes("index")) {
		problems.push(`robots=${JSON.stringify(robots)} expected index,follow`);
	}
	if (jsonLdCount !== 0) {
		problems.push(`json-ld count=${jsonLdCount} expected=0`);
	}
	return problems;
}

/**
 * Category/tag SPA head: the canonical must be the locale root (never a hash
 * URL and never the hashless category path, which the deployment 404s).
 *
 * @param {{ locale: "en" | "ko", canonicals: string[], documentTitle: string, expectedTitle: string }} input
 * @returns {string[]}
 */
export function evaluateCategorySeo({
	locale,
	canonicals,
	documentTitle,
	expectedTitle,
}) {
	const problems = [];
	const expectedCanonical = `${PRODUCTION_ORIGIN}${localePrefix(locale)}/`;
	if (canonicals.length !== 1) {
		problems.push(`canonical count=${canonicals.length} (expected 1)`);
	} else {
		if (canonicals[0].includes("#")) {
			problems.push(`canonical contains hash: ${canonicals[0]}`);
		}
		if (canonicals[0] !== expectedCanonical) {
			problems.push(
				`canonical=${JSON.stringify(canonicals[0])} expected=${JSON.stringify(expectedCanonical)}`,
			);
		}
	}
	if (typeof documentTitle !== "string" || documentTitle.trim() === "") {
		problems.push("document.title is empty");
	} else if (documentTitle !== expectedTitle) {
		problems.push(
			`document.title=${JSON.stringify(documentTitle)} expected=${JSON.stringify(expectedTitle)}`,
		);
	}
	return problems;
}

/**
 * @param {string} url
 * @param {string} [origin]
 * @returns {boolean}
 */
export function isSameOriginUrl(url, origin = PRODUCTION_ORIGIN) {
	try {
		return new URL(url).origin === origin;
	} catch {
		return false;
	}
}

/**
 * @param {string} url
 * @param {string} [origin]
 * @returns {boolean}
 */
export function isKoTreeUrl(url, origin = PRODUCTION_ORIGIN) {
	try {
		const parsed = new URL(url);
		if (parsed.origin !== origin) return false;
		return parsed.pathname === "/ko" || parsed.pathname.startsWith("/ko/");
	} catch {
		return false;
	}
}

/**
 * @param {string} loc
 * @returns {boolean}
 */
export function isKrUrl(loc) {
	try {
		const { pathname } = new URL(loc);
		return pathname === "/kr" || pathname.startsWith("/kr/");
	} catch {
		return false;
	}
}

/**
 * @param {string[]} locs
 * @param {{ from: string, to: string }[]} aliases
 * @param {string} [origin]
 * @returns {string[]}
 */
export function findLegacyAliasLocs(locs, aliases, origin = PRODUCTION_ORIGIN) {
	const aliased = new Set(
		aliases.map((alias) => `${origin}/post/${alias.from}/`),
	);
	return locs.filter((loc) => aliased.has(loc)).sort();
}

/**
 * @param {string[]} argv
 * @returns {{ includeSpaSeo: boolean, unknown: string[] }}
 */
export function parseCliArgs(argv) {
	const unknown = [];
	let includeSpaSeo = false;
	for (const arg of argv) {
		if (arg === "--include-spa-seo") {
			includeSpaSeo = true;
		} else {
			unknown.push(arg);
		}
	}
	return { includeSpaSeo, unknown };
}

/**
 * @param {{ canonicals: string[], documentTitle: string, expectedCanonical: string, expectedTitle: string }} input
 * @returns {string[]}
 */
export function evaluatePostSeo({
	canonicals,
	documentTitle,
	expectedCanonical,
	expectedTitle,
}) {
	const problems = [];
	if (canonicals.length !== 1) {
		problems.push(`canonical count=${canonicals.length} (expected 1)`);
	} else if (canonicals[0] !== expectedCanonical) {
		problems.push(`canonical=${canonicals[0]} (expected ${expectedCanonical})`);
	}
	if (documentTitle !== expectedTitle) {
		problems.push(
			`document.title=${JSON.stringify(documentTitle)} (expected ${JSON.stringify(expectedTitle)})`,
		);
	}
	return problems;
}

/**
 * @param {string} message
 */
function ensure(condition, message) {
	if (!condition) throw new Error(message);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function describeError(error) {
	if (error instanceof Error) {
		const cause =
			error.cause instanceof Error ? ` (cause: ${error.cause.message})` : "";
		return `${error.message}${cause}`.replace(/\s+/g, " ").trim();
	}
	return String(error).replace(/\s+/g, " ").trim();
}

/**
 * @param {string[]} items
 * @param {number} [limit]
 * @returns {string}
 */
function summarizeList(items, limit = 3) {
	if (items.length <= limit) return items.join(" | ");
	return `${items.slice(0, limit).join(" | ")} (+${items.length - limit} more)`;
}

function createReporter() {
	let checks = 0;
	let failed = 0;
	return {
		/**
		 * @param {string} id
		 * @param {() => Promise<string>} run
		 */
		async check(id, run) {
			checks += 1;
			try {
				const detail = await run();
				process.stdout.write(`ok   ${id}${detail ? ` ${detail}` : ""}\n`);
			} catch (error) {
				failed += 1;
				process.stdout.write(`FAIL ${id} ${describeError(error)}\n`);
			}
		},
		/**
		 * @param {string} id
		 * @param {string} reason
		 */
		skip(id, reason) {
			process.stdout.write(`SKIP ${id} ${reason}\n`);
		},
		summary() {
			return { checks, failed };
		},
	};
}

/**
 * @param {string} pathname
 * @param {{ redirect?: RequestRedirect }} [options]
 */
async function request(pathname, { redirect = "follow" } = {}) {
	const response = await fetch(`${PRODUCTION_ORIGIN}${pathname}`, {
		redirect,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		headers: { "user-agent": "wintrover-production-acceptance/1.0" },
	});
	const body = await response.text();
	return {
		status: response.status,
		url: response.url,
		headers: response.headers,
		body,
	};
}

async function checkKoLanding(slug) {
	const expectedCanonical = postCanonicalUrl("ko", slug);
	const expectedRedirect = postHashTarget("ko", slug);
	const response = await request(postLandingPath("ko", slug));
	const problems = [];
	if (response.status !== 200) problems.push(`status=${response.status}`);
	const canonicals = extractCanonicalHrefs(response.body);
	if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
		problems.push(
			`canonical=${JSON.stringify(canonicals)} expected=${JSON.stringify([expectedCanonical])}`,
		);
	}
	const redirects = extractReplaceTargets(response.body);
	if (redirects.length !== 1 || redirects[0] !== expectedRedirect) {
		problems.push(
			`location.replace=${JSON.stringify(redirects)} expected=${JSON.stringify([expectedRedirect])}`,
		);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return "canonical+redirect";
}

async function checkEnLanding(slug) {
	const response = await request(postLandingPath("en", slug));
	ensure(response.status === 200, `status=${response.status}`);
	return "status=200";
}

async function checkRoot(pathname, expectedLang) {
	const response = await request(pathname);
	const problems = [];
	if (response.status !== 200) problems.push(`status=${response.status}`);
	if (expectedLang) {
		const lang = extractHtmlLang(response.body);
		if (lang !== expectedLang) {
			problems.push(`lang=${lang} expected=${expectedLang}`);
		}
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return expectedLang ? `lang=${expectedLang}` : "status=200";
}

async function checkRedirect(pathname, expectedTarget) {
	const response = await request(pathname, { redirect: "manual" });
	const problems = [];
	if (response.status !== 301) problems.push(`status=${response.status}`);
	const location = response.headers.get("location");
	const normalized = normalizeLocation(location);
	if (normalized !== expectedTarget) {
		problems.push(
			`location=${JSON.stringify(location)} normalized=${JSON.stringify(normalized)} expected=${JSON.stringify(expectedTarget)}`,
		);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return `301 -> ${expectedTarget}`;
}

async function checkKrAliasDocument() {
	const response = await request("/kr/", { redirect: "manual" });
	const problems = evaluateKrAliasDocument({
		status: response.status,
		html: response.body,
	});
	if (problems.length > 0) throw new Error(problems.join("; "));
	return "canonical=/ko/ refresh=0; url=/ko/ robots=noindex";
}

/**
 * The second hop of the `/kr` chain is a document, not another HTTP redirect.
 * `redirect: "manual"` is required so a 301 cannot be silently followed into a
 * 200 and pass this check.
 */
async function checkKrKoHop() {
	const response = await request("/ko/", { redirect: "manual" });
	const problems = [];
	if (response.status === 301) {
		problems.push("second hop returned HTTP 301; expected 200 document");
	} else if (response.status !== 200) {
		problems.push(`status=${response.status} expected=200`);
	}
	const location = response.headers.get("location");
	if (location) {
		problems.push(`location=${JSON.stringify(location)} expected none`);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return "status=200 (not 301)";
}

async function checkSitemap({ root, sourceLocs, aliases, urlContract }) {
	const response = await request("/sitemap.xml");
	const problems = [];
	if (response.status !== 200) problems.push(`status=${response.status}`);
	const locs = extractSitemapLocs(response.body);
	const actual = locs.map((loc) => normalizeLocation(loc));
	const distSitemap = path.join(root, "dist", "sitemap.xml");
	const localLocs = fs.existsSync(distSitemap)
		? extractSitemapLocs(fs.readFileSync(distSitemap, "utf8")).map((loc) =>
				normalizeLocation(loc),
			)
		: null;
	const expectation = resolveSitemapPlan({
		contractLocs: urlContract ? urlContract.canonical : null,
		localLocs,
		sourceLocs: sourceLocs.map((loc) => normalizeLocation(loc)),
	});
	const comparison = compareUrlMultisets(actual, expectation.locs);
	if (!comparison.ok) {
		const details = [];
		if (comparison.missing.length > 0) {
			details.push(
				`missing ${comparison.missing.length}: ${summarizeList(comparison.missing)}`,
			);
		}
		if (comparison.unexpected.length > 0) {
			details.push(
				`unexpected ${comparison.unexpected.length}: ${summarizeList(comparison.unexpected)}`,
			);
		}
		problems.push(`multiset vs ${expectation.source} (${details.join("; ")})`);
	}
	if (comparison.duplicateActual.length > 0) {
		problems.push(
			`duplicate sitemap entries: ${summarizeList(comparison.duplicateActual)}`,
		);
	}
	if (comparison.duplicateExpected.length > 0) {
		problems.push(
			`duplicate expectation entries: ${summarizeList(comparison.duplicateExpected)}`,
		);
	}
	const krLocs = actual.filter((loc) => isKrUrl(`${PRODUCTION_ORIGIN}${loc}`));
	if (krLocs.length > 0) {
		problems.push(`kr entries: ${summarizeList(krLocs)}`);
	}
	const aliasPaths = urlContract
		? urlContract.aliases.map((alias) => alias.from)
		: aliases.map((alias) => `/post/${alias.from}/`);
	const aliasEntries = findAliasEntries(actual, aliasPaths);
	if (aliasEntries.length > 0) {
		problems.push(`alias entries: ${summarizeList(aliasEntries)}`);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return `locs=${locs.length} expected=${expectation.locs.length} source=${expectation.source}`;
}

async function checkStatus(pathname, expectedStatus) {
	const response = await request(pathname);
	ensure(
		response.status === expectedStatus,
		`status=${response.status} expected=${expectedStatus}`,
	);
	return `status=${expectedStatus}`;
}

async function checkUnknownHttp() {
	const response = await request(UNKNOWN_PATH, { redirect: "manual" });
	const problems = evaluateInitialNotFoundResponse({
		status: response.status,
		html: response.body,
		location: response.headers.get("location"),
	});
	if (problems.length > 0) throw new Error(problems.join("; "));
	return "status=404 noindex,nofollow no canonical/location";
}

/**
 * @param {import("puppeteer").Page} page
 */
function watchPage(page) {
	const badKoResponses = [];
	const failedRequests = [];
	page.on("response", (response) => {
		const url = response.url();
		if (isKoTreeUrl(url) && response.status() >= 400) {
			badKoResponses.push(`${response.status()} ${url}`);
		}
	});
	page.on("requestfailed", (request) => {
		const url = request.url();
		if (isSameOriginUrl(url)) {
			failedRequests.push(
				`${url} (${request.failure()?.errorText ?? "unknown"})`,
			);
		}
	});
	return { badKoResponses, failedRequests };
}

/**
 * @param {{ badKoResponses: string[], failedRequests: string[] }} watch
 * @returns {string[]}
 */
function requestProblems(watch) {
	const problems = [];
	if (watch.badKoResponses.length > 0) {
		problems.push(`ko responses >=400: ${summarizeList(watch.badKoResponses)}`);
	}
	if (watch.failedRequests.length > 0) {
		problems.push(`failed requests: ${summarizeList(watch.failedRequests)}`);
	}
	return problems;
}

/**
 * @param {import("puppeteer").Page} page
 * @param {string} label
 * @param {() => unknown} read
 * @param {(value: unknown) => boolean} isDone
 * @param {number} [timeout]
 * @returns {Promise<unknown>}
 */
async function waitForPageValue(
	page,
	label,
	read,
	isDone,
	timeout = BROWSER_TIMEOUT_MS,
) {
	const deadline = Date.now() + timeout;
	let last;
	while (Date.now() < deadline) {
		try {
			last = await page.evaluate(read);
			if (isDone(last)) return last;
		} catch (error) {
			const message = describeError(error);
			if (
				!/detached|Execution context|Cannot find context|Navigating frame/i.test(
					message,
				)
			) {
				throw error;
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`${label} wait timed out: last=${JSON.stringify(last)}`);
}

/**
 * @param {import("puppeteer").Browser} browser
 * @param {string} slug
 */
async function visitPost(browser, slug) {
	const page = await browser.newPage();
	const watch = watchPage(page);
	let stage = "goto";
	try {
		const response = await page.goto(
			`${PRODUCTION_ORIGIN}${postLandingPath("ko", slug)}`,
			{
				waitUntil: "networkidle0",
				timeout: BROWSER_TIMEOUT_MS,
			},
		);
		const problems = [];
		if (response?.status() !== 200) {
			problems.push(`landing status=${response?.status() ?? "null"}`);
		}
		stage = "hash";
		await waitForPageValue(
			page,
			"hash",
			() => window.location.hash,
			(hash) => hash === postHashFragment(slug),
		);
		stage = "h1";
		await waitForPageValue(
			page,
			"h1",
			() => Boolean(document.querySelector(".post-detail h1.post-title")),
			Boolean,
		);
		stage = "images";
		await waitForPageValue(
			page,
			"images",
			() =>
				[...document.querySelectorAll(".markdown-content img")].map((image) => {
					image.loading = "eager";
					return image.complete;
				}),
			(states) => states.every(Boolean),
		);
		stage = "evaluate";
		const info = await page.evaluate(() => {
			const titleElement = document.querySelector(".post-detail h1.post-title");
			const images = [...document.querySelectorAll(".markdown-content img")];
			return {
				lang: document.documentElement.lang,
				hash: window.location.hash,
				title: titleElement?.textContent?.trim() ?? "",
				imageCount: images.length,
				brokenImages: images.filter((image) => image.naturalWidth === 0).length,
				canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(
					(link) => link.getAttribute("href"),
				),
				documentTitle: document.title,
			};
		});
		if (info.lang !== "ko") problems.push(`lang=${info.lang}`);
		if (info.hash !== postHashFragment(slug)) {
			problems.push(`hash=${JSON.stringify(info.hash)}`);
		}
		if (!/[가-힣]/.test(info.title)) {
			problems.push(`h1 not Korean: ${JSON.stringify(info.title)}`);
		}
		if (info.brokenImages > 0) {
			problems.push(`broken images=${info.brokenImages}/${info.imageCount}`);
		}
		problems.push(...requestProblems(watch));
		return { problems, info };
	} catch (error) {
		const state = await page
			.evaluate(() => ({
				url: window.location.href,
				hash: window.location.hash,
				readyState: document.readyState,
				title: document.title,
				hasPostTitle: Boolean(
					document.querySelector(".post-detail h1.post-title"),
				),
				body: (document.body?.innerText ?? "")
					.replace(/\s+/g, " ")
					.slice(0, 160),
			}))
			.catch((stateError) => ({ stateError: describeError(stateError) }));
		throw new Error(
			`${stage}: ${describeError(error)} | state=${JSON.stringify(state)}`,
		);
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {import("puppeteer").Browser} browser
 */
async function checkHome(browser) {
	const page = await browser.newPage();
	const watch = watchPage(page);
	try {
		const response = await page.goto(`${PRODUCTION_ORIGIN}/ko/`, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		const problems = [];
		if (response?.status() !== 200) {
			problems.push(`status=${response?.status() ?? "null"}`);
		}
		await waitForPageValue(
			page,
			"render",
			() => Boolean(document.querySelector("main, article, .post-list")),
			Boolean,
		);
		const info = await page.evaluate(() => ({
			lang: document.documentElement.lang,
			hangul: /[가-힣]/.test(document.body.textContent ?? ""),
		}));
		if (info.lang !== "ko") problems.push(`lang=${info.lang}`);
		if (!info.hangul) problems.push("no Hangul text");
		problems.push(...requestProblems(watch));
		if (problems.length > 0) throw new Error(problems.join("; "));
		return "lang=ko";
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {import("puppeteer").Browser} browser
 */
async function checkResume(browser) {
	const page = await browser.newPage();
	const watch = watchPage(page);
	try {
		const response = await page.goto(`${PRODUCTION_ORIGIN}/ko/resume/`, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		const problems = [];
		if (response?.status() !== 200) {
			problems.push(`status=${response?.status() ?? "null"}`);
		}
		await waitForPageValue(
			page,
			"projects",
			() => Boolean(document.querySelector("#projects .card")),
			Boolean,
		);
		const lang = await page.evaluate(() => document.documentElement.lang);
		if (lang !== "ko") problems.push(`lang=${lang}`);
		problems.push(...requestProblems(watch));
		if (problems.length > 0) throw new Error(problems.join("; "));
		return "lang=ko";
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {import("puppeteer").Browser} browser
 */
async function checkAxiom(browser) {
	const page = await browser.newPage();
	try {
		const response = await page.goto(`${PRODUCTION_ORIGIN}/ko/resume/`, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		ensure(
			response?.status() === 200,
			`status=${response?.status() ?? "null"}`,
		);
		await waitForPageValue(
			page,
			"projects",
			() => Boolean(document.querySelector("#projects .card")),
			Boolean,
		);
		const href = await page.evaluate(() => {
			const card = [
				...document.querySelectorAll("#projects article.card"),
			].find(
				(candidate) =>
					candidate.querySelector("h4")?.textContent?.trim() === "Axiom",
			);
			return card?.querySelector("a")?.getAttribute("href") ?? null;
		});
		ensure(
			href === AXIOM_REPOSITORY_URL,
			`Axiom card href=${JSON.stringify(href)} expected=${JSON.stringify(AXIOM_REPOSITORY_URL)}`,
		);
		const targetPromise = browser.waitForTarget(
			(target) => target.opener() === page.target(),
			{ timeout: BROWSER_TIMEOUT_MS },
		);
		await page.click('#projects a[href="https://github.com/Archright/Axiom"]');
		const target = await targetPromise;
		const popup = await target.asPage();
		ensure(popup !== null, "popup page unavailable");
		try {
			await waitForPageValue(
				popup,
				"popup url",
				() => window.location.href,
				(href) => href.startsWith(AXIOM_REPOSITORY_URL),
			);
			const finalUrl = popup.url();
			ensure(
				finalUrl.startsWith(AXIOM_REPOSITORY_URL),
				`popup final url=${finalUrl}`,
			);
			return `popup=${finalUrl}`;
		} finally {
			await popup.close().catch(() => {});
		}
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {import("puppeteer").Browser} browser
 */
async function checkKrBrowser(browser) {
	const page = await browser.newPage();
	try {
		await page.goto(`${PRODUCTION_ORIGIN}/kr`, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		await waitForPageValue(
			page,
			"pathname",
			() => window.location.pathname,
			(pathname) => pathname === "/ko/",
		);
		const info = await page.evaluate(() => ({
			path: window.location.pathname,
			lang: document.documentElement.lang,
		}));
		const problems = [];
		if (info.path !== "/ko/") problems.push(`path=${info.path}`);
		if (info.lang !== "ko") problems.push(`lang=${info.lang}`);
		if (problems.length > 0) throw new Error(problems.join("; "));
		return "path=/ko/ lang=ko";
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * Stage 2 of the 404 contract: the browser must end on a same-origin hash URL
 * whose document response is 200. The initial unknown-path response (stage 1)
 * is judged separately over HTTP, and the SPA head (stage 3) is opt-in.
 *
 * @param {import("puppeteer").Browser} browser
 * @returns {Promise<{ problems: string[], info: { href: string, pathname: string, hash: string, rendered: boolean, documentTitle: string, canonicals: string[], robots: string[], jsonLdCount: number } | null }>}
 */
async function visitUnknown(browser) {
	const page = await browser.newPage();
	const unknownUrl = `${PRODUCTION_ORIGIN}${UNKNOWN_PATH}`;
	const navigations = [];
	page.on("response", (response) => {
		if (response.request().isNavigationRequest()) {
			navigations.push({ url: response.url(), status: response.status() });
		}
	});
	const watch = watchPage(page);
	let stage = "goto";
	try {
		await page.goto(unknownUrl, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		stage = "notFound";
		await waitForPageValue(
			page,
			"notFound",
			() => ({
				href: window.location.href,
				hash: window.location.hash,
				rendered: Boolean(document.querySelector('[data-testid="not-found"]')),
			}),
			(value) => value.rendered && value.hash.startsWith("#/"),
		);
		stage = "evaluate";
		const info = await page.evaluate(() => ({
			href: window.location.href,
			pathname: window.location.pathname,
			hash: window.location.hash,
			rendered: Boolean(document.querySelector('[data-testid="not-found"]')),
			documentTitle: document.title,
			canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(
				(link) => link.getAttribute("href"),
			),
			robots: [...document.querySelectorAll('meta[name="robots"]')].map(
				(meta) => (meta.getAttribute("content") ?? "").toLowerCase(),
			),
			jsonLdCount: document.querySelectorAll(
				'script[type="application/ld+json"]',
			).length,
		}));
		const problems = [];
		const initialNavigation =
			navigations.find((entry) => entry.url === unknownUrl) ?? null;
		if (initialNavigation?.status !== 404) {
			problems.push(
				`initial status=${initialNavigation?.status ?? "none"} expected=404`,
			);
		}
		const finalNavigation = navigations.at(-1) ?? null;
		if (!finalNavigation) {
			problems.push("no final navigation response observed");
		} else {
			if (!isSameOriginUrl(finalNavigation.url)) {
				problems.push(`final document not same-origin: ${finalNavigation.url}`);
			}
			if (finalNavigation.status !== 200) {
				problems.push(
					`final document status=${finalNavigation.status} url=${finalNavigation.url}`,
				);
			}
		}
		if (!isSameOriginUrl(info.href)) {
			problems.push(`final url not same-origin: ${info.href}`);
		}
		if (!info.hash.startsWith("#/")) {
			problems.push(
				`final hash=${JSON.stringify(info.hash)} expected same-origin hash route`,
			);
		}
		if (!info.rendered) problems.push("NotFound view missing");
		problems.push(...requestProblems(watch));
		return { problems, info };
	} catch (error) {
		const state = await page
			.evaluate(() => ({
				url: window.location.href,
				hash: window.location.hash,
				title: document.title,
				notFound: Boolean(document.querySelector('[data-testid="not-found"]')),
				body: (document.body?.textContent ?? "")
					.replace(/\s+/g, " ")
					.slice(0, 160),
			}))
			.catch((stateError) => ({ stateError: describeError(stateError) }));
		throw new Error(
			`${stage}: ${describeError(error)} | state=${JSON.stringify(state)}`,
		);
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {import("puppeteer").Browser} browser
 * @param {(info: { pathname: string, canonicals: string[], documentTitle: string, robots: string[], jsonLdCount: number }) => void} onState
 */
async function checkUnknownBrowser(browser, onState) {
	const result = await visitUnknown(browser);
	if (result.info) onState(result.info);
	if (result.problems.length > 0) throw new Error(result.problems.join("; "));
	return `hash=${result.info?.hash ?? ""} document=200`;
}

/**
 * @param {import("puppeteer").Browser} browser
 * @param {"en" | "ko"} locale
 * @param {{ category: string, categorySlug: string, tag: string, tagSlug: string }} sample
 * @param {boolean} includeTag
 */
async function checkCategoryRoute(browser, locale, sample, includeTag) {
	const target = includeTag
		? categoryTagHashTarget(locale, sample.categorySlug, sample.tagSlug)
		: categoryHashTarget(locale, sample.categorySlug);
	const expectedTitle = includeTag
		? `${sample.category} #${sample.tagSlug}`
		: sample.category;
	const expectedCanonical = `${PRODUCTION_ORIGIN}${localePrefix(locale)}/`;
	const page = await browser.newPage();
	const watch = watchPage(page);
	let stage = "goto";
	try {
		const response = await page.goto(`${PRODUCTION_ORIGIN}${target}`, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		stage = "render";
		await waitForPageValue(
			page,
			"category",
			() => ({
				title: document.title,
				rendered: Boolean(document.querySelector(".blog-page")),
			}),
			(value) => value.rendered && value.title.includes(sample.category),
		);
		stage = "evaluate";
		const info = await page.evaluate(() => ({
			canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(
				(link) => link.getAttribute("href"),
			),
			documentTitle: document.title,
		}));
		const problems = [];
		if (response?.status() !== 200) {
			problems.push(`status=${response?.status() ?? "null"} expected=200`);
		}
		problems.push(
			...evaluateCategorySeo({
				locale,
				canonicals: info.canonicals,
				documentTitle: info.documentTitle,
				expectedTitle,
			}),
		);
		problems.push(...requestProblems(watch));
		if (problems.length > 0) throw new Error(problems.join("; "));
		return `canonical=${expectedCanonical} title=${JSON.stringify(info.documentTitle)}`;
	} catch (error) {
		const state = await page
			.evaluate(() => ({
				href: window.location.href,
				title: document.title,
				canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(
					(link) => link.getAttribute("href"),
				),
				body: (document.body?.textContent ?? "")
					.replace(/\s+/g, " ")
					.slice(0, 160),
			}))
			.catch((stateError) => ({ stateError: describeError(stateError) }));
		throw new Error(
			`${stage}: ${describeError(error)} | state=${JSON.stringify(state)}`,
		);
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {{ slug: string, title: string }[]} koEntries
 * @param {boolean} includeSpaSeo
 * @param {{ ko: ReturnType<typeof pickCategoryTagSample>, en: ReturnType<typeof pickCategoryTagSample> }} categorySamples
 */
async function runBrowserChecks(
	reporter,
	koEntries,
	includeSpaSeo,
	categorySamples,
) {
	let browser = null;
	try {
		const { default: puppeteer } = await import("puppeteer");
		browser = await puppeteer.launch({
			headless: true,
			timeout: BROWSER_TIMEOUT_MS,
			args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=ko-KR"],
		});
	} catch (error) {
		await reporter.check("browser:launch", async () => {
			throw error;
		});
		return;
	}

	try {
		for (const entry of koEntries) {
			let seoState = null;
			await reporter.check(`browser:post:${entry.slug}`, async () => {
				const result = await visitPost(browser, entry.slug);
				seoState = {
					canonicals: result.info.canonicals,
					documentTitle: result.info.documentTitle,
					expectedTitle: entry.title,
				};
				if (result.problems.length > 0) {
					throw new Error(result.problems.join("; "));
				}
				return `images=${result.info.imageCount}`;
			});
			if (!includeSpaSeo) continue;
			await reporter.check(`spa-seo:${entry.slug}`, async () => {
				ensure(seoState !== null, "post visit failed; SEO state unavailable");
				const problems = evaluatePostSeo({
					canonicals: seoState.canonicals,
					documentTitle: seoState.documentTitle,
					expectedCanonical: postCanonicalUrl("ko", entry.slug),
					expectedTitle: seoState.expectedTitle,
				});
				if (problems.length > 0) throw new Error(problems.join("; "));
				return "canonical=1 title=post";
			});
		}
		await reporter.check("browser:home", () => checkHome(browser));
		await reporter.check("browser:resume", () => checkResume(browser));
		await reporter.check("browser:axiom", () => checkAxiom(browser));
		await reporter.check("browser:kr", () => checkKrBrowser(browser));
		let unknownState = null;
		await reporter.check("browser:unknown", () =>
			checkUnknownBrowser(browser, (info) => {
				unknownState = info;
			}),
		);
		await reporter.check("browser:unknown:dom", async () => {
			ensure(
				unknownState !== null,
				"unknown page visit failed; SPA head state unavailable",
			);
			const locale =
				unknownState.pathname === "/ko" ||
				unknownState.pathname.startsWith("/ko/")
					? "ko"
					: "en";
			const problems = evaluateSpaNotFoundDocument({
				locale,
				canonicals: unknownState.canonicals,
				documentTitle: unknownState.documentTitle,
				robots: unknownState.robots,
				jsonLdCount: unknownState.jsonLdCount,
			});
			if (problems.length > 0) throw new Error(problems.join("; "));
			return `canonical=${locale} root robots=index json-ld=0`;
		});
		if (!includeSpaSeo) return;
		for (const locale of /** @type {const} */ (["ko", "en"])) {
			const sample = categorySamples[locale];
			await reporter.check(`spa-seo:category:${locale}`, async () => {
				ensure(sample !== null, `no category/tag sample derived for ${locale}`);
				return checkCategoryRoute(browser, locale, sample, false);
			});
			await reporter.check(`spa-seo:category-tag:${locale}`, async () => {
				ensure(sample !== null, `no category/tag sample derived for ${locale}`);
				return checkCategoryRoute(browser, locale, sample, true);
			});
		}
	} finally {
		await browser.close().catch(() => {});
	}
}

/**
 * @param {string} root
 * @returns {Promise<{ koEntries: { slug: string, title: string }[], enEntries: { slug: string, title: string }[], aliases: { from: string, to: string }[] }>}
 */
async function loadRepositoryContract(root) {
	const { tsImport } = await import("tsx/esm/api");
	const buildScript = path.join(root, "scripts", "build-github.ts");
	const module = await tsImport(
		pathToFileURL(buildScript).href,
		import.meta.url,
	);
	if (typeof module.collectPostEntries !== "function") {
		throw new Error(
			"collectPostEntries export missing from scripts/build-github.ts",
		);
	}
	if (!Array.isArray(module.LEGACY_POST_ALIASES)) {
		throw new Error(
			"LEGACY_POST_ALIASES export missing from scripts/build-github.ts",
		);
	}
	const koEntries = module.collectPostEntries(root, "ko");
	const enEntries = module.collectPostEntries(root, "en");
	if (!Array.isArray(koEntries) || !Array.isArray(enEntries)) {
		throw new Error("collectPostEntries did not return arrays");
	}
	return { koEntries, enEntries, aliases: module.LEGACY_POST_ALIASES };
}

/**
 * Reads `url-contract.json` from the repository root. A missing file is not an
 * error (source derivation is the fallback); malformed content fails closed.
 *
 * @param {string} root
 * @returns {{ canonical: string[], aliases: { from: string, to: string | null }[] } | null}
 */
function loadUrlContract(root) {
	const contractPath = path.join(root, URL_CONTRACT_FILENAME);
	if (!fs.existsSync(contractPath)) return null;
	let parsed;
	try {
		parsed = JSON.parse(fs.readFileSync(contractPath, "utf8"));
	} catch (error) {
		throw new Error(
			`${URL_CONTRACT_FILENAME}: invalid JSON (${describeError(error)})`,
		);
	}
	return parseUrlContract(parsed);
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkMarkdownFiles(dir) {
	const files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkMarkdownFiles(fullPath));
		} else if (entry.name.endsWith(".md")) {
			files.push(fullPath);
		}
	}
	return files.sort();
}

/**
 * Derives one real category/tag pair per locale from source frontmatter.
 *
 * @param {string} root
 * @returns {Promise<{ ko: ReturnType<typeof pickCategoryTagSample>, en: ReturnType<typeof pickCategoryTagSample> }>}
 */
async function loadCategoryTagSamples(root) {
	const { tsImport } = await import("tsx/esm/api");
	const utils = await tsImport(
		pathToFileURL(path.join(root, "src", "lib", "utils.ts")).href,
		import.meta.url,
	);
	if (typeof utils.parseFrontMatter !== "function") {
		throw new Error("parseFrontMatter export missing from src/lib/utils.ts");
	}
	const toEntry = (filePath) => {
		const { data } = utils.parseFrontMatter(fs.readFileSync(filePath, "utf8"));
		return {
			slug: path.relative(root, filePath).replaceAll("\\", "/"),
			category: typeof data.category === "string" ? data.category : "",
			tags: Array.isArray(data.tags)
				? data.tags.map(String)
				: typeof data.tags === "string"
					? data.tags
							.split(",")
							.map((tag) => tag.trim())
							.filter(Boolean)
					: [],
		};
	};
	const koDir = path.join(root, "src", "posts", "ko");
	const postsDir = path.join(root, "src", "posts");
	const koEntries = fs.existsSync(koDir)
		? walkMarkdownFiles(koDir).map(toEntry)
		: [];
	const enEntries = fs.existsSync(postsDir)
		? walkMarkdownFiles(postsDir)
				.filter(
					(filePath) =>
						!path
							.relative(postsDir, filePath)
							.replaceAll("\\", "/")
							.toLowerCase()
							.startsWith("ko/"),
				)
				.map(toEntry)
		: [];
	return {
		ko: pickCategoryTagSample(koEntries),
		en: pickCategoryTagSample(enEntries),
	};
}

/**
 * @param {{ slug: string }[]} entries
 * @returns {{ slug: string, title: string }[]}
 */
function sortEntries(entries) {
	return [...entries].sort((left, right) =>
		left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0,
	);
}

export async function main(argv = process.argv.slice(2)) {
	const reporter = createReporter();
	const { includeSpaSeo, unknown } = parseCliArgs(argv);
	if (unknown.length > 0) {
		process.stderr.write(`Unknown option(s): ${unknown.join(" ")}\n`);
		process.stderr.write(
			"Usage: node scripts/verify-production.mjs [--include-spa-seo]\n",
		);
		process.exitCode = 2;
		return;
	}

	const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
	let contract;
	let urlContract;
	let categorySamples;
	try {
		contract = await loadRepositoryContract(root);
		urlContract = loadUrlContract(root);
		categorySamples = await loadCategoryTagSamples(root);
	} catch (error) {
		process.stdout.write(`FAIL setup ${describeError(error)}\n`);
		process.stdout.write("RESULT checks=0 fail=1\n");
		process.exitCode = 1;
		return;
	}

	const koEntries = sortEntries(contract.koEntries);
	const enEntries = sortEntries(contract.enEntries);
	const sourceLocs = expectedSitemapLocs({
		koSlugs: koEntries.map((entry) => entry.slug),
		enSlugs: enEntries.map((entry) => entry.slug),
	});

	for (const entry of koEntries) {
		await reporter.check(`http:ko-landing:${entry.slug}`, () =>
			checkKoLanding(entry.slug),
		);
	}
	for (const entry of enEntries) {
		await reporter.check(`http:en-landing:${entry.slug}`, () =>
			checkEnLanding(entry.slug),
		);
	}
	await reporter.check("http:root:/", () => checkRoot("/", "en"));
	await reporter.check("http:root:/ko/", () => checkRoot("/ko/", "ko"));
	await reporter.check("http:root:/resume/", () => checkRoot("/resume/"));
	await reporter.check("http:root:/ko/resume/", () => checkRoot("/ko/resume/"));
	await reporter.check("http:alias:/kr", () => checkRedirect("/kr", "/kr/"));
	await reporter.check("http:alias:/kr/", () => checkKrAliasDocument());
	await reporter.check("http:alias:/kr/chain:/ko/", () => checkKrKoHop());
	await reporter.check("http:alias:/ko", () => checkRedirect("/ko", "/ko/"));
	await reporter.check("http:sitemap", () =>
		checkSitemap({
			root,
			sourceLocs,
			aliases: contract.aliases,
			urlContract,
		}),
	);
	for (const pathname of FORBIDDEN_KO_PATHS) {
		await reporter.check(`http:forbidden:${pathname}`, () =>
			checkStatus(pathname, 404),
		);
	}
	for (const pathname of REQUIRED_ROOT_PATHS) {
		await reporter.check(`http:required:${pathname}`, () =>
			checkStatus(pathname, 200),
		);
	}
	await reporter.check("http:unknown", () => checkUnknownHttp());

	if (includeSpaSeo) {
		process.stdout.write(
			"MODE spa-seo enabled: post, category, and tag head checks are required\n",
		);
	} else {
		reporter.skip(
			"spa-seo",
			"opt-in; pass --include-spa-seo to require post and category/tag head checks",
		);
	}
	await runBrowserChecks(reporter, koEntries, includeSpaSeo, categorySamples);

	const summary = reporter.summary();
	process.stdout.write(
		`RESULT checks=${summary.checks} fail=${summary.failed}\n`,
	);
	process.exitCode = summary.failed > 0 ? 1 : 0;
}

function isMainModule() {
	if (!process.argv[1]) return false;
	try {
		return (
			fs.realpathSync(process.argv[1]) ===
			fs.realpathSync(fileURLToPath(import.meta.url))
		);
	} catch {
		return false;
	}
}

if (isMainModule()) {
	await main();
}
