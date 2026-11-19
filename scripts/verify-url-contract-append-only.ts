import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	deriveCanonicalUrls,
	diffUrlContracts,
	parseUrlContract,
	URL_CONTRACT_FILE,
	type UrlContract,
	validateUrlContract,
} from "./public-urls";

export type AppendOnlyEvaluation = {
	removed: string[];
	violations: string[];
};

export function evaluateAppendOnly(
	base: UrlContract | null,
	head: UrlContract,
	derived: Set<string>,
): AppendOnlyEvaluation {
	const violations = validateUrlContract(head, derived);
	if (base === null) {
		return { removed: [], violations };
	}
	const diff = diffUrlContracts(base, head);
	return {
		removed: diff.removed,
		violations: [...violations, ...diff.violations],
	};
}

function parseBaseArg(args: string[]): string | null {
	const index = args.indexOf("--base");
	if (index === -1) return null;
	const value = args[index + 1];
	if (!value || value.startsWith("--")) return null;
	return value;
}

function gitSupportsCommit(sha: string): boolean {
	try {
		execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
			stdio: ["ignore", "ignore", "pipe"],
		});
		return true;
	} catch {
		return false;
	}
}

function fetchBase(sha: string): boolean {
	try {
		execFileSync("git", ["fetch", "--no-tags", "--depth=1", "origin", sha], {
			stdio: ["ignore", "ignore", "pipe"],
		});
		return true;
	} catch {
		return false;
	}
}

function readBaseRegistry(sha: string): UrlContract | null {
	let stdout: string;
	try {
		stdout = execFileSync("git", ["show", `${sha}:${URL_CONTRACT_FILE}`], {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch {
		return null;
	}
	return parseUrlContract(JSON.parse(stdout) as unknown);
}

function readHeadRegistry(root: string): UrlContract {
	const contractPath = path.join(root, URL_CONTRACT_FILE);
	if (!fs.existsSync(contractPath)) {
		throw new Error(`head ${URL_CONTRACT_FILE} is missing`);
	}
	return parseUrlContract(
		JSON.parse(fs.readFileSync(contractPath, "utf-8")) as unknown,
	);
}

function runCli() {
	const baseSha = parseBaseArg(process.argv.slice(2));
	if (!baseSha) {
		process.stderr.write(
			"usage: tsx scripts/verify-url-contract-append-only.ts --base <sha>\n",
		);
		process.exit(2);
	}

	if (!gitSupportsCommit(baseSha)) {
		fetchBase(baseSha);
	}
	if (!gitSupportsCommit(baseSha)) {
		process.stderr.write(
			`[url-contract] cannot resolve base commit ${baseSha} (fetch failed)\n`,
		);
		process.exit(1);
	}

	const root = process.cwd();
	const base = readBaseRegistry(baseSha);
	const head = readHeadRegistry(root);
	const derived = deriveCanonicalUrls(root);
	const result = evaluateAppendOnly(base, head, derived);

	if (base === null) {
		process.stdout.write(
			"[url-contract] bootstrap: base registry absent, head must equal derived canonical URLs\n",
		);
	}
	for (const removed of result.removed) {
		process.stdout.write(`removed: ${removed}\n`);
	}
	for (const violation of result.violations) {
		process.stderr.write(`violation: ${violation}\n`);
	}
	if (result.removed.length > 0 || result.violations.length > 0) {
		process.exit(1);
	}

	const canonicalCount = head.urls.filter(
		(entry) => entry.kind === "canonical",
	).length;
	const aliasCount = head.urls.filter((entry) => entry.kind === "alias").length;
	process.stdout.write(
		`[url-contract] PASS append-only base=${baseSha.slice(0, 12)} canonical=${canonicalCount} alias=${aliasCount}\n`,
	);
}

if (
	process.argv[1] &&
	path.basename(process.argv[1]) === "verify-url-contract-append-only.ts"
) {
	try {
		runCli();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`[url-contract] ${message}\n`);
		process.exit(1);
	}
}
