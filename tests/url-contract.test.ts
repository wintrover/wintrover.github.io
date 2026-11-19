import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	type AliasUrlEntry,
	type CanonicalUrlEntry,
	deriveCanonicalUrls,
	diffUrlContracts,
	FIXED_CANONICAL_URLS,
	localeForUrl,
	parsePostAliasUrl,
	parseUrlContract,
	resolveAlias,
	serializeUrlContract,
	sortUrlContract,
	type UrlContract,
	type UrlEntry,
	validateUrlContract,
} from "../scripts/public-urls";
import { planUrlContractUpdate } from "../scripts/update-url-contract";
import { evaluateAppendOnly } from "../scripts/verify-url-contract-append-only";

function canonical(url: string): CanonicalUrlEntry {
	return { url, kind: "canonical", locale: localeForUrl(url) };
}

function alias(url: string, target: string): AliasUrlEntry {
	return { url, kind: "alias", target, evidence: "test fixture" };
}

function contractOf(urls: UrlEntry[]): UrlContract {
	return { version: 1, urls };
}

function derivedOf(...urls: string[]): Set<string> {
	return new Set(urls);
}

describe("url contract URL helpers", () => {
	test("fixed canonical URLs are the four deployment entrypoints", () => {
		expect(FIXED_CANONICAL_URLS).toEqual([
			"/",
			"/ko/",
			"/resume/",
			"/ko/resume/",
		]);
		expect(localeForUrl("/")).toBe("en");
		expect(localeForUrl("/ko/")).toBe("ko");
		expect(localeForUrl("/ko/resume/")).toBe("ko");
		expect(localeForUrl("/kr/")).toBe("ko");
	});

	test("post URL parsing distinguishes locale post trees from locale aliases", () => {
		expect(parsePostAliasUrl("/post/legacy-slug/")).toEqual({
			locale: "en",
			slug: "legacy-slug",
		});
		expect(parsePostAliasUrl("/ko/post/legacy-slug/")).toEqual({
			locale: "ko",
			slug: "legacy-slug",
		});
		expect(parsePostAliasUrl("/kr/")).toBeNull();
		expect(parsePostAliasUrl("/resume/")).toBeNull();
	});

	test("deriveCanonicalUrls produces the 61 published canonical URLs", () => {
		const derived = deriveCanonicalUrls(process.cwd());
		expect(derived.size).toBe(61);
		for (const url of FIXED_CANONICAL_URLS) {
			expect(derived.has(url)).toBe(true);
		}
	});
});

describe("url contract schema parsing", () => {
	test("accepts a canonical + alias registry", () => {
		const parsed = parseUrlContract({
			version: 1,
			urls: [canonical("/"), canonical("/ko/"), alias("/kr/", "/ko/")],
		});
		expect(parsed.version).toBe(1);
		expect(parsed.urls).toHaveLength(3);
	});

	test("rejects unknown versions", () => {
		expect(() => parseUrlContract({ version: 2, urls: [] })).toThrow(/version/);
	});

	test("rejects a missing urls array", () => {
		expect(() => parseUrlContract({ version: 1 })).toThrow(/urls/);
	});

	test("rejects non-normalized URLs", () => {
		for (const url of ["post/x/", "/post/x", "/post//x/", "/../x/"]) {
			expect(() =>
				parseUrlContract({ version: 1, urls: [canonical(url)] }),
			).toThrow(/url/);
		}
	});

	test("rejects unknown kinds", () => {
		expect(() =>
			parseUrlContract({ version: 1, urls: [{ url: "/x/", kind: "ghost" }] }),
		).toThrow(/kind/);
	});

	test("rejects canonical entries without a valid locale", () => {
		expect(() =>
			parseUrlContract({
				version: 1,
				urls: [{ url: "/", kind: "canonical", locale: "fr" }],
			}),
		).toThrow(/locale/);
	});

	test("rejects alias entries without target or evidence", () => {
		expect(() =>
			parseUrlContract({
				version: 1,
				urls: [{ url: "/kr/", kind: "alias", evidence: "missing target" }],
			}),
		).toThrow(/target/);
		expect(() =>
			parseUrlContract({
				version: 1,
				urls: [{ url: "/kr/", kind: "alias", target: "/ko/" }],
			}),
		).toThrow(/evidence/);
	});
});

describe("url contract validation", () => {
	test("passes when registry canonicals equal derived canonicals", () => {
		const contract = contractOf([
			canonical("/"),
			canonical("/ko/"),
			alias("/kr/", "/ko/"),
		]);
		expect(validateUrlContract(contract, derivedOf("/", "/ko/"))).toEqual([]);
	});

	test("reports a missing canonical URL", () => {
		const contract = contractOf([canonical("/")]);
		expect(validateUrlContract(contract, derivedOf("/", "/ko/"))).toContain(
			"missing canonical url: /ko/",
		);
	});

	test("reports a canonical URL that is no longer derived", () => {
		const contract = contractOf([canonical("/"), canonical("/post/gone/")]);
		expect(validateUrlContract(contract, derivedOf("/"))).toContain(
			"canonical url is not derived: /post/gone/",
		);
	});

	test("reports duplicate URLs", () => {
		const contract = contractOf([canonical("/"), canonical("/")]);
		expect(validateUrlContract(contract, derivedOf("/"))).toContain(
			"duplicate url: /",
		);
	});

	test("reports self-referencing aliases", () => {
		const contract = contractOf([canonical("/"), alias("/kr/", "/kr/")]);
		expect(validateUrlContract(contract, derivedOf("/"))).toContain(
			"self-referencing alias: /kr/",
		);
	});

	test("reports an alias target that is not registered", () => {
		const contract = contractOf([canonical("/"), alias("/kr/", "/ko/")]);
		expect(validateUrlContract(contract, derivedOf("/"))).toContain(
			"alias target is not registered: /kr/ -> /ko/",
		);
	});

	test("allows alias chains and resolves them to the final canonical", () => {
		const contract = contractOf([
			canonical("/post/c/"),
			alias("/post/b/", "/post/c/"),
			alias("/post/a/", "/post/b/"),
		]);
		expect(validateUrlContract(contract, derivedOf("/post/c/"))).toEqual([]);
		expect(() => resolveAlias(contract, "/post/a/")).not.toThrow();
	});

	test("reports alias cycles", () => {
		const contract = contractOf([
			canonical("/post/c/"),
			alias("/post/a/", "/post/b/"),
			alias("/post/b/", "/post/a/"),
		]);
		const violations = validateUrlContract(contract, derivedOf("/post/c/"));
		expect(
			violations.some((violation) => violation.includes("circular alias")),
		).toBe(true);
	});

	test("reports an alias URL that collides with a derived canonical URL", () => {
		const contract = contractOf([
			canonical("/post/current/"),
			alias("/post/current/", "/post/other/"),
			canonical("/post/other/"),
		]);
		const violations = validateUrlContract(
			contract,
			derivedOf("/post/current/", "/post/other/"),
		);
		expect(
			violations.some((violation) =>
				violation.includes("alias url collides with a derived canonical"),
			),
		).toBe(true);
	});

	test("reports canonical locale mismatches", () => {
		const contract = contractOf([
			{ url: "/ko/resume/", kind: "canonical", locale: "en" },
		]);
		expect(validateUrlContract(contract, derivedOf("/ko/resume/"))).toContain(
			"canonical locale mismatch: /ko/resume/ declared en, url implies ko",
		);
	});

	test("reports aliases that change locale", () => {
		const contract = contractOf([
			canonical("/ko/post/target/"),
			alias("/post/legacy/", "/ko/post/target/"),
		]);
		expect(
			validateUrlContract(contract, derivedOf("/ko/post/target/")),
		).toContain("alias locale change: /post/legacy/ -> /ko/post/target/");
	});
});

describe("url contract alias resolution", () => {
	test("canonical URLs resolve to themselves", () => {
		const contract = contractOf([canonical("/")]);
		expect(resolveAlias(contract, "/")).toEqual({
			final: "/",
			chain: ["/"],
		});
	});

	test("a single alias resolves to its canonical target", () => {
		const contract = contractOf([canonical("/ko/"), alias("/kr/", "/ko/")]);
		expect(resolveAlias(contract, "/kr/")).toEqual({
			final: "/ko/",
			chain: ["/kr/", "/ko/"],
		});
	});

	test("A -> B -> C resolves A to the final canonical C", () => {
		const contract = contractOf([
			canonical("/post/c/"),
			alias("/post/b/", "/post/c/"),
			alias("/post/a/", "/post/b/"),
		]);
		expect(resolveAlias(contract, "/post/a/")).toEqual({
			final: "/post/c/",
			chain: ["/post/a/", "/post/b/", "/post/c/"],
		});
	});

	test("circular chains throw instead of looping", () => {
		const contract = contractOf([
			alias("/post/a/", "/post/b/"),
			alias("/post/b/", "/post/a/"),
		]);
		expect(() => resolveAlias(contract, "/post/a/")).toThrow(/circular alias/);
	});

	test("unregistered URLs throw", () => {
		expect(() => resolveAlias(contractOf([]), "/missing/")).toThrow(
			/not registered/,
		);
	});
});

describe("url contract append-only diff", () => {
	test("appending a new canonical URL is allowed", () => {
		const base = contractOf([canonical("/")]);
		const head = contractOf([canonical("/"), canonical("/post/new/")]);
		expect(diffUrlContracts(base, head)).toEqual({
			removed: [],
			violations: [],
		});
	});

	test("renaming a post converts its canonical URL into an alias", () => {
		const base = contractOf([canonical("/post/old/")]);
		const head = contractOf([
			alias("/post/old/", "/post/new/"),
			canonical("/post/new/"),
		]);
		expect(diffUrlContracts(base, head)).toEqual({
			removed: [],
			violations: [],
		});
	});

	test("deleting a canonical URL is forbidden", () => {
		const base = contractOf([canonical("/"), canonical("/post/gone/")]);
		const head = contractOf([canonical("/")]);
		const diff = diffUrlContracts(base, head);
		expect(diff.removed).toEqual(["/post/gone/"]);
		expect(
			diff.violations.some((violation) => violation.startsWith("removed: ")),
		).toBe(true);
	});

	test("deleting an alias is forbidden", () => {
		const base = contractOf([canonical("/ko/"), alias("/kr/", "/ko/")]);
		const head = contractOf([canonical("/ko/")]);
		const diff = diffUrlContracts(base, head);
		expect(diff.removed).toEqual(["/kr/"]);
		expect(diff.violations).toContain(
			"removed: /kr/ (published URLs must stay reachable)",
		);
	});

	test("retargeting an existing alias is forbidden", () => {
		const base = contractOf([
			canonical("/post/new/"),
			canonical("/post/other/"),
			alias("/post/old/", "/post/new/"),
		]);
		const head = contractOf([
			canonical("/post/new/"),
			canonical("/post/other/"),
			alias("/post/old/", "/post/other/"),
		]);
		const diff = diffUrlContracts(base, head);
		expect(diff.removed).toEqual([]);
		expect(diff.violations).toContain(
			"retargeted alias: /post/old/ -> /post/other/ (was /post/new/)",
		);
	});

	test("keeping an alias target unchanged is allowed", () => {
		const base = contractOf([canonical("/ko/"), alias("/kr/", "/ko/")]);
		const head = contractOf([
			canonical("/ko/"),
			{ ...alias("/kr/", "/ko/"), evidence: "updated evidence" },
		]);
		expect(diffUrlContracts(base, head)).toEqual({
			removed: [],
			violations: [],
		});
	});

	test("converting an alias back into a canonical URL is forbidden", () => {
		const base = contractOf([
			canonical("/post/new/"),
			alias("/post/old/", "/post/new/"),
		]);
		const head = contractOf([canonical("/post/new/"), canonical("/post/old/")]);
		const diff = diffUrlContracts(base, head);
		expect(diff.violations).toContain(
			"alias converted to canonical: /post/old/",
		);
	});

	test("changing the declared locale of a canonical URL is forbidden", () => {
		const base = contractOf([
			{ url: "/post/a/", kind: "canonical", locale: "en" },
		]);
		const head = contractOf([
			{ url: "/post/a/", kind: "canonical", locale: "ko" },
		]);
		const diff = diffUrlContracts(base, head);
		expect(diff.violations).toContain("locale changed: /post/a/ (en -> ko)");
	});

	test("renaming into another locale tree is forbidden", () => {
		const base = contractOf([canonical("/post/old/")]);
		const head = contractOf([
			canonical("/ko/post/new/"),
			alias("/post/old/", "/ko/post/new/"),
		]);
		const diff = diffUrlContracts(base, head);
		expect(
			diff.violations.some((violation) =>
				violation.includes("alias locale change"),
			),
		).toBe(true);
	});

	test("appending an alias chain is allowed", () => {
		const base = contractOf([canonical("/post/c/")]);
		const head = contractOf([
			canonical("/post/c/"),
			alias("/post/b/", "/post/c/"),
			alias("/post/a/", "/post/b/"),
		]);
		expect(diffUrlContracts(base, head)).toEqual({
			removed: [],
			violations: [],
		});
	});

	test("appending an alias with an unregistered target is forbidden", () => {
		const base = contractOf([canonical("/post/c/")]);
		const head = contractOf([
			canonical("/post/c/"),
			alias("/post/a/", "/post/missing/"),
		]);
		const diff = diffUrlContracts(base, head);
		expect(
			diff.violations.some((violation) =>
				violation.includes("alias target is not registered"),
			),
		).toBe(true);
	});
});

describe("url contract bootstrap gate", () => {
	test("bootstrap passes when the head registry equals derived URLs", () => {
		const head = contractOf([canonical("/"), canonical("/ko/")]);
		expect(evaluateAppendOnly(null, head, derivedOf("/", "/ko/"))).toEqual({
			removed: [],
			violations: [],
		});
	});

	test("bootstrap fails when the head registry drifts from derived URLs", () => {
		const head = contractOf([canonical("/")]);
		const result = evaluateAppendOnly(null, head, derivedOf("/", "/ko/"));
		expect(result.violations).toContain("missing canonical url: /ko/");
	});

	test("non-bootstrap evaluation applies the append-only diff", () => {
		const base = contractOf([canonical("/")]);
		const head = contractOf([canonical("/")]);
		expect(evaluateAppendOnly(base, head, derivedOf("/"))).toEqual({
			removed: [],
			violations: [],
		});
	});
});

describe("url contract serialization and update planning", () => {
	test("serialization sorts by URL, uses 2-space JSON, and ends with a newline", () => {
		const serialized = serializeUrlContract(
			contractOf([alias("/kr/", "/ko/"), canonical("/ko/"), canonical("/")]),
		);
		expect(serialized.endsWith("\n")).toBe(true);
		expect(serialized.split("\n")[1]).toBe('  "version": 1,');
		const parsed = JSON.parse(serialized) as UrlContract;
		expect(parsed.urls.map((entry) => entry.url)).toEqual([
			"/",
			"/ko/",
			"/kr/",
		]);
	});

	test("sorting does not mutate the input contract", () => {
		const contract = contractOf([canonical("/ko/"), canonical("/")]);
		const sorted = sortUrlContract(contract);
		expect(sorted.urls.map((entry) => entry.url)).toEqual(["/", "/ko/"]);
		expect(contract.urls.map((entry) => entry.url)).toEqual(["/ko/", "/"]);
	});

	test("update planning adds missing canonicals and reports stale ones", () => {
		const base = contractOf([
			canonical("/"),
			canonical("/post/old/"),
			alias("/kr/", "/ko/"),
			canonical("/ko/"),
		]);
		const plan = planUrlContractUpdate(
			base,
			derivedOf("/", "/ko/", "/post/new/"),
		);
		expect(plan.added).toEqual(["/post/new/"]);
		expect(plan.stale).toEqual(["/post/old/"]);
		expect(plan.next.urls).toContainEqual(alias("/kr/", "/ko/"));
		expect(plan.next.urls).toContainEqual(canonical("/post/new/"));
	});
});

describe("committed url-contract.json", () => {
	test("registry holds 61 canonical and 2 alias URLs and matches derived URLs", () => {
		const raw = fs.readFileSync(
			path.join(process.cwd(), "url-contract.json"),
			"utf-8",
		);
		const contract = parseUrlContract(JSON.parse(raw));
		const canonicalEntries = contract.urls.filter(
			(entry) => entry.kind === "canonical",
		);
		const aliasEntries = contract.urls.filter(
			(entry) => entry.kind === "alias",
		);
		expect(canonicalEntries).toHaveLength(61);
		expect(aliasEntries).toHaveLength(2);
		expect(contract.urls).toHaveLength(63);
		expect(
			validateUrlContract(contract, deriveCanonicalUrls(process.cwd())),
		).toEqual([]);
		expect(aliasEntries.map((entry) => entry.url).sort()).toEqual([
			"/kr/",
			"/post/the-agent-wrote-the-theorem-a-formal-disproof-a-pipeline-gap-and-a-refusal-to-cheat/",
		]);
	});

	test("committed registry is byte-identical to its canonical serialization", () => {
		const raw = fs.readFileSync(
			path.join(process.cwd(), "url-contract.json"),
			"utf-8",
		);
		expect(serializeUrlContract(parseUrlContract(JSON.parse(raw)))).toBe(raw);
	});
});
