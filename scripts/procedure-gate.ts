import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type GateResult = {
	ok: boolean;
	missing: string[];
	requiresEvidence: boolean;
	changedFiles: string[];
};

const IMPLEMENTATION_PREFIXES = [
	"src/",
	"scripts/",
	"engine/",
	".github/workflows/",
];

const TEST_FILE_REGEX = /^tests\/.+\.test\.[cm]?[jt]sx?$/;
const FEATURE_FILE_REGEX = /^tests\/features\/.+\.feature$/;

function normalizeFiles(files: string[]) {
	return files.map((file) => file.trim().replace(/\\/g, "/")).filter(Boolean);
}

function matchesImplementationFile(filePath: string) {
	if (filePath === "CONTEXT.md") return false;
	if (filePath.startsWith("tests/")) return false;
	return IMPLEMENTATION_PREFIXES.some((prefix) => filePath.startsWith(prefix));
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
	return {
		ok: missing.length === 0,
		missing,
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
