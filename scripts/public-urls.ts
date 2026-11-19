import { collectPostEntries } from "./post-entries";

export const URL_CONTRACT_FILE = "url-contract.json";
export const URL_CONTRACT_VERSION = 1;

export const FIXED_CANONICAL_URLS = [
	"/",
	"/ko/",
	"/resume/",
	"/ko/resume/",
] as const;

export type UrlLocale = "en" | "ko";

export type CanonicalUrlEntry = {
	url: string;
	kind: "canonical";
	locale: UrlLocale;
};

export type AliasUrlEntry = {
	url: string;
	kind: "alias";
	target: string;
	evidence: string;
};

export type UrlEntry = CanonicalUrlEntry | AliasUrlEntry;

export type UrlContract = {
	version: typeof URL_CONTRACT_VERSION;
	urls: UrlEntry[];
};

export type AliasResolution = {
	final: string;
	chain: string[];
};

export type UrlContractDiff = {
	removed: string[];
	violations: string[];
};

const CONTRACT_URL_PATTERN = /^\/(?:[^/]+\/)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContractUrl(value: unknown): value is string {
	if (typeof value !== "string") return false;
	if (!CONTRACT_URL_PATTERN.test(value)) return false;
	if (value.includes("..") || /[?#\\\s]/.test(value)) return false;
	return true;
}

export function localeForUrl(url: string): UrlLocale {
	if (url.startsWith("/ko/") || url.startsWith("/kr/")) return "ko";
	return "en";
}

export function parsePostAliasUrl(
	url: string,
): { locale: UrlLocale; slug: string } | null {
	const match = url.match(/^\/(ko\/)?post\/([^/]+)\/$/);
	if (!match) return null;
	return {
		locale: match[1] ? "ko" : "en",
		slug: match[2],
	};
}

export function deriveCanonicalUrls(root: string): Set<string> {
	const urls = new Set<string>(FIXED_CANONICAL_URLS);
	for (const post of collectPostEntries(root, "en")) {
		urls.add(`/post/${post.slug}/`);
	}
	for (const post of collectPostEntries(root, "ko")) {
		urls.add(`/ko/post/${post.slug}/`);
	}
	return urls;
}

function parseEntry(raw: unknown, index: number): UrlEntry {
	if (!isRecord(raw)) {
		throw new Error(`url contract entry at index ${index} must be an object`);
	}
	const url = raw.url;
	if (!isContractUrl(url)) {
		throw new Error(
			`invalid url at index ${index}: ${JSON.stringify(url)} (root-relative, leading and trailing slash)`,
		);
	}
	if (raw.kind === "canonical") {
		if (raw.locale !== "en" && raw.locale !== "ko") {
			throw new Error(
				`canonical locale at index ${index} must be "en" or "ko"`,
			);
		}
		return { url, kind: "canonical", locale: raw.locale };
	}
	if (raw.kind === "alias") {
		if (!isContractUrl(raw.target)) {
			throw new Error(
				`alias target at index ${index} must be a root-relative url with leading and trailing slash`,
			);
		}
		if (typeof raw.evidence !== "string" || raw.evidence.trim() === "") {
			throw new Error(
				`alias evidence at index ${index} must be a non-empty string`,
			);
		}
		return { url, kind: "alias", target: raw.target, evidence: raw.evidence };
	}
	throw new Error(
		`invalid kind at index ${index}: ${JSON.stringify(raw.kind)} (expected "canonical" or "alias")`,
	);
}

export function parseUrlContract(json: unknown): UrlContract {
	if (!isRecord(json)) {
		throw new Error("url contract must be a JSON object");
	}
	if (json.version !== URL_CONTRACT_VERSION) {
		throw new Error(
			`unsupported url contract version: ${JSON.stringify(json.version)} (expected ${URL_CONTRACT_VERSION})`,
		);
	}
	if (!Array.isArray(json.urls)) {
		throw new Error("url contract urls must be an array");
	}
	return {
		version: URL_CONTRACT_VERSION,
		urls: json.urls.map((entry, index) => parseEntry(entry, index)),
	};
}

function resolveAliasFromMap(
	entries: Map<string, UrlEntry>,
	url: string,
): AliasResolution {
	const chain: string[] = [];
	const visited = new Set<string>();
	let current = url;
	while (true) {
		if (visited.has(current)) {
			throw new Error(
				`circular alias chain: ${[...chain, current].join(" -> ")}`,
			);
		}
		visited.add(current);
		chain.push(current);
		const entry = entries.get(current);
		if (!entry) {
			throw new Error(`url is not registered in the url contract: ${current}`);
		}
		if (entry.kind === "canonical") {
			return { final: current, chain };
		}
		current = entry.target;
	}
}

export function resolveAlias(
	contract: UrlContract,
	url: string,
): AliasResolution {
	const entries = new Map(contract.urls.map((entry) => [entry.url, entry]));
	return resolveAliasFromMap(entries, url);
}

export function validateUrlContract(
	contract: UrlContract,
	derived: Set<string>,
): string[] {
	const violations: string[] = [];
	const entries = new Map<string, UrlEntry>();
	for (const entry of contract.urls) {
		if (entries.has(entry.url)) {
			violations.push(`duplicate url: ${entry.url}`);
			continue;
		}
		entries.set(entry.url, entry);
	}

	const canonicalUrls = new Set(
		contract.urls
			.filter((entry) => entry.kind === "canonical")
			.map((entry) => entry.url),
	);

	for (const url of [...derived].sort()) {
		if (!canonicalUrls.has(url)) {
			violations.push(`missing canonical url: ${url}`);
		}
	}
	for (const url of [...canonicalUrls].sort()) {
		if (!derived.has(url)) {
			violations.push(`canonical url is not derived: ${url}`);
		}
	}

	for (const entry of contract.urls) {
		if (entry.kind === "canonical") {
			const implied = localeForUrl(entry.url);
			if (entry.locale !== implied) {
				violations.push(
					`canonical locale mismatch: ${entry.url} declared ${entry.locale}, url implies ${implied}`,
				);
			}
			continue;
		}
		if (entry.url === entry.target) {
			violations.push(`self-referencing alias: ${entry.url}`);
		}
		if (!entries.has(entry.target)) {
			violations.push(
				`alias target is not registered: ${entry.url} -> ${entry.target}`,
			);
			continue;
		}
		if (derived.has(entry.url)) {
			violations.push(
				`alias url collides with a derived canonical url: ${entry.url}`,
			);
		}
		try {
			const resolution = resolveAliasFromMap(entries, entry.url);
			if (localeForUrl(resolution.final) !== localeForUrl(entry.url)) {
				violations.push(
					`alias locale change: ${entry.url} -> ${resolution.final}`,
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			violations.push(`alias chain invalid: ${entry.url}: ${message}`);
		}
	}

	return violations;
}

function appendAliasResolutionViolations(
	origin: string,
	entry: AliasUrlEntry,
	entries: Map<string, UrlEntry>,
	localeChangeViolations: boolean,
	violations: string[],
) {
	if (!entries.has(entry.target)) {
		violations.push(
			`alias target is not registered: ${origin} -> ${entry.target}`,
		);
		return;
	}
	let resolution: AliasResolution;
	try {
		resolution = resolveAliasFromMap(entries, origin);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		violations.push(`alias chain invalid: ${origin}: ${message}`);
		return;
	}
	const finalEntry = entries.get(resolution.final);
	if (!finalEntry || finalEntry.kind !== "canonical") {
		violations.push(
			`alias does not resolve to a canonical url: ${origin} -> ${resolution.final}`,
		);
		return;
	}
	if (
		localeChangeViolations &&
		localeForUrl(resolution.final) !== localeForUrl(origin)
	) {
		violations.push(`alias locale change: ${origin} -> ${resolution.final}`);
	}
}

export function diffUrlContracts(
	base: UrlContract,
	head: UrlContract,
): UrlContractDiff {
	const baseEntries = new Map(base.urls.map((entry) => [entry.url, entry]));
	const headEntries = new Map(head.urls.map((entry) => [entry.url, entry]));
	const removed = [...baseEntries.keys()]
		.filter((url) => !headEntries.has(url))
		.sort();
	const violations: string[] = removed.map(
		(url) => `removed: ${url} (published URLs must stay reachable)`,
	);

	for (const url of [...baseEntries.keys()].sort()) {
		const before = baseEntries.get(url);
		const after = headEntries.get(url);
		if (!before || !after) continue;

		if (before.kind === "canonical" && after.kind === "canonical") {
			if (before.locale !== after.locale) {
				violations.push(
					`locale changed: ${url} (${before.locale} -> ${after.locale})`,
				);
			}
			continue;
		}
		if (before.kind === "canonical" && after.kind === "alias") {
			appendAliasResolutionViolations(
				url,
				after,
				headEntries,
				true,
				violations,
			);
			continue;
		}
		if (before.kind === "alias" && after.kind === "alias") {
			if (before.target !== after.target) {
				violations.push(
					`retargeted alias: ${url} -> ${after.target} (was ${before.target})`,
				);
			}
			continue;
		}
		violations.push(`alias converted to canonical: ${url}`);
	}

	for (const url of [...headEntries.keys()].sort()) {
		if (baseEntries.has(url)) continue;
		const entry = headEntries.get(url);
		if (entry?.kind === "alias") {
			appendAliasResolutionViolations(
				url,
				entry,
				headEntries,
				true,
				violations,
			);
		}
	}

	return { removed, violations };
}

export function sortUrlContract(contract: UrlContract): UrlContract {
	return {
		version: contract.version,
		urls: [...contract.urls].sort((a, b) =>
			a.url < b.url ? -1 : a.url > b.url ? 1 : 0,
		),
	};
}

export function serializeUrlContract(contract: UrlContract): string {
	return `${JSON.stringify(sortUrlContract(contract), null, 2)}\n`;
}
