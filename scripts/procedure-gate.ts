import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type GateResult = {
	ok: boolean;
	missing: string[];
	requiresEvidence: boolean;
	changedFiles: string[];
};

type RefValidationResult = {
	ok: boolean;
	unresolvedRefs: string[];
};

const IMPLEMENTATION_PREFIXES = [
	"src/",
	"scripts/",
	"engine/",
	".github/workflows/",
];

const TEST_FILE_REGEX = /^tests\/.+\.test\.[cm]?[jt]sx?$/;
const FEATURE_FILE_REGEX = /^tests\/features\/.+\.feature$/;
const REF_PATTERN = /@ref\s+(REQ-[A-Z]+-\d+)/g;

function normalizeFiles(files: string[]) {
	return files.map((file) => file.trim().replace(/\\/g, "/")).filter(Boolean);
}

function matchesImplementationFile(filePath: string) {
	if (filePath === "CONTEXT.md") return false;
	if (filePath.startsWith("tests/")) return false;
	return IMPLEMENTATION_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function extractRefsFromFile(filePath: string): string[] {
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const refs: string[] = [];
		let match: RegExpExecArray | null;
		while ((match = REF_PATTERN.exec(content)) !== null) {
			refs.push(match[1]);
		}
		return [...new Set(refs)];
	} catch {
		return [];
	}
}

function extractRefsFromContext(): Set<string> {
	try {
		const content = fs.readFileSync("CONTEXT.md", "utf-8");
		const refs: Set<string> = new Set();
		let match: RegExpExecArray | null;
		while ((match = REF_PATTERN.exec(content)) !== null) {
			refs.add(match[1]);
		}
		const bracketPattern = /\[REQ-[A-Z]+-\d+\]/g;
		while ((match = bracketPattern.exec(content)) !== null) {
			refs.add(match[0].slice(1, -1));
		}
		return refs;
	} catch {
		return new Set();
	}
}

function extractRefsFromFeatures(): Set<string> {
	const refs: Set<string> = new Set();
	const featuresDir = "tests/features";
	try {
		if (!fs.existsSync(featuresDir)) return refs;
		const files = fs
			.readdirSync(featuresDir)
			.filter((f) => f.endsWith(".feature"));
		for (const file of files) {
			const content = fs.readFileSync(path.join(featuresDir, file), "utf-8");
			let match: RegExpExecArray | null;
			while ((match = REF_PATTERN.exec(content)) !== null) {
				refs.add(match[1]);
			}
		}
	} catch {}
	return refs;
}

function validateRefs(changedFiles: string[]): RefValidationResult {
	const allRefsInContext = extractRefsFromContext();
	const allRefsInFeatures = extractRefsFromFeatures();
	const combinedRefs = new Set([...allRefsInContext, ...allRefsInFeatures]);
	const unresolvedRefs: string[] = [];
	for (const file of changedFiles) {
		if (!matchesImplementationFile(file)) continue;
		const fileRefs = extractRefsFromFile(file);
		for (const ref of fileRefs) {
			if (!combinedRefs.has(ref)) {
				unresolvedRefs.push(`${file} -> ${ref}`);
			}
		}
	}
	return {
		ok: unresolvedRefs.length === 0,
		unresolvedRefs,
	};
}

export function evaluateProcedureGate(changedFiles: string[]): GateResult {
	const normalized = normalizeFiles(changedFiles);
	const requiresEvidence = normalized.some(matchesImplementationFile);
	if (!requiresEvidence) {
		return {
			ok: true,
			missing: [],
			requiresEvidence,
			changedFiles: normalized,
		};
	}
	const missing: string[] = [];
	const hasContext = normalized.includes("CONTEXT.md");
	const hasFeature = normalized.some((file) => FEATURE_FILE_REGEX.test(file));
	const hasTest = normalized.some((file) => TEST_FILE_REGEX.test(file));
	if (!hasContext) missing.push("CONTEXT.md");
	if (!hasFeature) missing.push("tests/features/*.feature");
	if (!hasTest) missing.push("tests/**/*.test.ts");
	if (missing.length > 0) {
		return {
			ok: false,
			missing,
			requiresEvidence,
			changedFiles: normalized,
		};
	}
	const refValidation = validateRefs(normalized);
	if (!refValidation.ok) {
		return {
			ok: false,
			missing: refValidation.unresolvedRefs.map((r) => `unresolved @ref: ${r}`),
			requiresEvidence,
			changedFiles: normalized,
		};
	}
	return {
		ok: true,
		missing: [],
		requiresEvidence,
		changedFiles: normalized,
	};
}

function resolveCiRange() {
	const eventName = process.env.GITHUB_EVENT_NAME || "";
	const eventPath = process.env.GITHUB_EVENT_PATH || "";
	if (!eventPath || !fs.existsSync(eventPath)) {
		return "HEAD~1...HEAD";
	}
	const raw = fs.readFileSync(eventPath, "utf-8");
	const eventData = JSON.parse(raw) as {
		before?: string;
		after?: string;
		pull_request?: {
			base?: { sha?: string };
			head?: { sha?: string };
		};
	};
	if (eventName === "pull_request" || eventName === "pull_request_target") {
		const base = eventData.pull_request?.base?.sha;
		const head = eventData.pull_request?.head?.sha;
		if (base && head) return `${base}...${head}`;
	}
	const before = eventData.before;
	const after = eventData.after;
	if (before && after && !/^0+$/.test(before)) return `${before}...${after}`;
	if (after) return `${after}~1...${after}`;
	return "HEAD~1...HEAD";
}

function diffNameOnlyByRange(range: string) {
	const safeRange = range.replace(/"/g, "");
	try {
		const stdout = execSync(`git --no-pager diff --name-only "${safeRange}"`, {
			encoding: "utf-8",
		});
		return stdout.split(/\r?\n/).filter(Boolean);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const canFallback =
			message.includes("no merge base") && safeRange.includes("...");
		if (!canFallback) throw error;
		const fallbackRange = safeRange.replace("...", "..");
		const stdout = execSync(
			`git --no-pager diff --name-only "${fallbackRange}"`,
			{ encoding: "utf-8" },
		);
		return stdout.split(/\r?\n/).filter(Boolean);
	}
}

function getChangedFiles(mode: "ci" | "staged") {
	if (mode === "staged") {
		const stdout = execSync("git --no-pager diff --name-only --cached", {
			encoding: "utf-8",
		});
		return stdout.split(/\r?\n/).filter(Boolean);
	}
	return diffNameOnlyByRange(resolveCiRange());
}

function parseModeArg(args: string[]) {
	const found = args.find((arg) => arg.startsWith("--mode="));
	if (!found) return "ci";
	const value = found.split("=")[1];
	return value === "staged" ? "staged" : "ci";
}

function runCli() {
	const mode = parseModeArg(process.argv.slice(2));
	const changedFiles = getChangedFiles(mode);
	const result = evaluateProcedureGate(changedFiles);
	if (result.ok) {
		process.stdout.write(
			`[procedure-gate] PASS mode=${mode} changed=${result.changedFiles.length}\n`,
		);
		return;
	}
	const message = [
		`[procedure-gate] FAIL mode=${mode}`,
		`changed files: ${result.changedFiles.join(", ")}`,
		`missing required evidence: ${result.missing.join(", ")}`,
	].join("\n");
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

if (process.argv[1] && path.basename(process.argv[1]) === "procedure-gate.ts") {
	runCli();
}
