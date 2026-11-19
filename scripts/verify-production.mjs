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
export const EXPECTED_SITEMAP_LOC_COUNT = 62;
export const UNKNOWN_PATH = "/definitely-not-a-real-path-xyz/";
export const AXIOM_REPOSITORY_URL = "https://github.com/Archright/Axiom";

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
	const expectedCanonical = `${PRODUCTION_ORIGIN}/ko/`;
	const response = await request("/kr/");
	const problems = [];
	if (response.status !== 200) problems.push(`status=${response.status}`);
	const canonicals = extractCanonicalHrefs(response.body);
	if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
		problems.push(
			`canonical=${JSON.stringify(canonicals)} expected=${JSON.stringify([expectedCanonical])}`,
		);
	}
	const refreshes = extractMetaRefreshTargets(response.body);
	if (refreshes.length !== 1 || refreshes[0] !== "/ko/") {
		problems.push(
			`refresh=${JSON.stringify(refreshes)} expected=${JSON.stringify(["/ko/"])}`,
		);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return "canonical=/ko/ refresh=/ko/";
}

async function checkSitemap({ root, sourceLocs, aliases }) {
	const response = await request("/sitemap.xml");
	const problems = [];
	if (response.status !== 200) problems.push(`status=${response.status}`);
	const locs = extractSitemapLocs(response.body);
	if (locs.length !== EXPECTED_SITEMAP_LOC_COUNT) {
		problems.push(
			`loc count=${locs.length} expected=${EXPECTED_SITEMAP_LOC_COUNT}`,
		);
	}
	const distSitemap = path.join(root, "dist", "sitemap.xml");
	const localLocs = fs.existsSync(distSitemap)
		? extractSitemapLocs(fs.readFileSync(distSitemap, "utf8"))
		: null;
	const expectation = resolveSitemapExpectation({ localLocs, sourceLocs });
	const comparison = compareUrlMultisets(locs, expectation.locs);
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
	const krLocs = locs.filter(isKrUrl);
	if (krLocs.length > 0) {
		problems.push(`kr entries: ${summarizeList(krLocs)}`);
	}
	const aliasLocs = findLegacyAliasLocs(locs, aliases);
	if (aliasLocs.length > 0) {
		problems.push(`legacy alias entries: ${summarizeList(aliasLocs)}`);
	}
	if (problems.length > 0) throw new Error(problems.join("; "));
	return `locs=${locs.length} expectation=${expectation.source}`;
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
	const response = await request(UNKNOWN_PATH);
	ensure(response.status === 404, `status=${response.status} expected=404`);
	return "status=404";
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
 * @param {import("puppeteer").Browser} browser
 */
async function checkUnknownBrowser(browser) {
	const page = await browser.newPage();
	const unknownUrl = `${PRODUCTION_ORIGIN}${UNKNOWN_PATH}`;
	const statuses = [];
	page.on("response", (response) => {
		if (response.url() === unknownUrl) statuses.push(response.status());
	});
	try {
		await page.goto(unknownUrl, {
			waitUntil: "networkidle0",
			timeout: BROWSER_TIMEOUT_MS,
		});
		const problems = [];
		if (!statuses.includes(404)) {
			problems.push(
				`initial statuses=${JSON.stringify(statuses)} expected=404`,
			);
		}
		await waitForPageValue(
			page,
			"notFound",
			() =>
				/Page not found|페이지를 찾을 수 없습니다/.test(
					document.body.textContent ?? "",
				),
			Boolean,
		);
		if (problems.length > 0) throw new Error(problems.join("; "));
		return "404+NotFound";
	} finally {
		await page.close().catch(() => {});
	}
}

/**
 * @param {ReturnType<typeof createReporter>} reporter
 * @param {{ slug: string, title: string }[]} koEntries
 * @param {boolean} includeSpaSeo
 */
async function runBrowserChecks(reporter, koEntries, includeSpaSeo) {
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
		await reporter.check("browser:unknown", () => checkUnknownBrowser(browser));
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
	try {
		contract = await loadRepositoryContract(root);
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
	await reporter.check("http:alias:/ko", () => checkRedirect("/ko", "/ko/"));
	await reporter.check("http:sitemap", () =>
		checkSitemap({ root, sourceLocs, aliases: contract.aliases }),
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
			"MODE spa-seo enabled: post canonical/title checks are required\n",
		);
	} else {
		reporter.skip(
			"spa-seo",
			"disabled until the SPA head fix deploys; pass --include-spa-seo to require it",
		);
	}
	await runBrowserChecks(reporter, koEntries, includeSpaSeo);

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
