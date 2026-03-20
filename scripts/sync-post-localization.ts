import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type SyncOutcome = {
	koPath: string;
	enPath: string;
	updated: boolean;
	reason: string;
};

type SectionRule = {
	slug: string;
	koAnchors: string[];
	heading: string;
	replacementBody: string;
};

const KO_POST_PREFIX = "src/posts/ko/";
const MARKDOWN_FILE_REGEX = /\.md$/i;

const SECTION_RULES: SectionRule[] = [
	{
		slug: "2026-03-19-20",
		koAnchors: [
			"이 검증은 사후 리뷰가 아니다.\\",
			"다른 사용자의 ID로 요청을 보내는 경우:\\",
			"→ 즉시 반례로 탐지되고 코드 생성이 중단된다.\\",
		],
		heading: "### 3. Formal Verification: Mathematical Proof",
		replacementBody: [
			"Trying to block probabilistic failure with another probabilistic tool is mathematically hollow.\\",
			"The emerging pattern of AI code review (such as Claude Review) is still a 99%-accurate AI inspecting code produced by another 99%-accurate AI.\\",
			"In that setup, accuracy may rise to 99.99%, but it can never become 100%.",
			"",
			"Most security incidents emerge precisely from that neglected 0.01% gap.\\",
			'In engineering, "almost certain" is a synonym for "not certain."\\',
			"Archright internalizes mathematical verification and authorization tools such as Z3 Solver, Lean 4, and Cedar in its engine.\\",
			'Instead of probabilistic comfort—"tests passed"—it proves "no exception exists" mathematically and frees engineers from review labor.',
			"",
			"This verification is not a post-hoc review.\\",
			"In Archright, it runs in this order:",
			"",
			"1. Convert intent into verifiable rules",
			"2. Validate those rules hold across all states",
			"3. Search automatically for counterexamples that break the rules",
			"4. Stop code generation when a counterexample is found",
			"5. Generate code only when all constraints hold",
			"",
			"For example:\\",
			"“A user must only be allowed to read their own data,”\\",
			"→ regardless of incoming request,",
			"a user must only be allowed to read their own data.",
			"",
			"If a request is sent with another user's ID:\\",
			"→ it is immediately detected as a counterexample and code generation is stopped.\\",
			"→ if even one violating case exists, that logic is not generated.",
			"",
			'In short, we do not "catch bugs."',
			"We create a state where bugs cannot exist.",
		].join("\n"),
	},
];

function normalizePath(filePath: string) {
	return filePath.trim().replace(/\\/g, "/");
}

function getChangedFilesByMode(mode: "staged" | "working") {
	const command =
		mode === "staged"
			? "git --no-pager diff --name-only --cached"
			: "git --no-pager diff --name-only";
	const stdout = execSync(command, { encoding: "utf-8" });
	return stdout.split(/\r?\n/).map(normalizePath).filter(Boolean);
}

function resolveEnPathFromKoPath(koPath: string) {
	if (!koPath.startsWith(KO_POST_PREFIX)) return null;
	return koPath.replace(KO_POST_PREFIX, "src/posts/");
}

function findRuleBySlug(koPath: string) {
	const slug = path.basename(koPath, ".md");
	return SECTION_RULES.find((rule) => rule.slug === slug) ?? null;
}

function replaceSectionBody(
	enContent: string,
	heading: string,
	replacementBody: string,
) {
	const headingIndex = enContent.indexOf(heading);
	if (headingIndex < 0) return { changed: false, content: enContent };
	const headingLineEnd = enContent.indexOf("\n", headingIndex);
	if (headingLineEnd < 0) return { changed: false, content: enContent };
	const bodyStart = headingLineEnd + 1;
	const nextBoundary = enContent.indexOf("\n<hr ", bodyStart);
	if (nextBoundary < 0) return { changed: false, content: enContent };
	const normalizedReplacement = `\n${replacementBody}\n`;
	const existingBody = enContent.slice(bodyStart, nextBoundary);
	if (existingBody === normalizedReplacement) {
		return { changed: false, content: enContent };
	}
	const nextContent = `${enContent.slice(0, bodyStart)}${normalizedReplacement}${enContent.slice(nextBoundary)}`;
	return { changed: true, content: nextContent };
}

export function syncEnglishContentForSlug(
	koPath: string,
	koContent: string,
	enContent: string,
) {
	const rule = findRuleBySlug(koPath);
	if (!rule) {
		return { changed: false, content: enContent, reason: "no-rule" as const };
	}
	const anchorsSatisfied = rule.koAnchors.every((anchor) =>
		koContent.includes(anchor),
	);
	if (!anchorsSatisfied) {
		return {
			changed: false,
			content: enContent,
			reason: "ko-anchor-missing" as const,
		};
	}
	const replaced = replaceSectionBody(
		enContent,
		rule.heading,
		rule.replacementBody,
	);
	return {
		changed: replaced.changed,
		content: replaced.content,
		reason: replaced.changed
			? ("patched" as const)
			: ("already-synced" as const),
	};
}

function stageFile(filePath: string) {
	execSync(`git --no-pager add "${filePath.replace(/"/g, "")}"`, {
		stdio: "inherit",
	});
}

function runSync(options: {
	mode: "staged" | "working";
	write: boolean;
	stage: boolean;
	paths: string[];
}) {
	const sourcePaths =
		options.paths.length > 0
			? options.paths.map(normalizePath)
			: getChangedFilesByMode(options.mode);
	const koTargets = sourcePaths.filter(
		(file) => file.startsWith(KO_POST_PREFIX) && MARKDOWN_FILE_REGEX.test(file),
	);
	const outcomes: SyncOutcome[] = [];
	for (const koPath of koTargets) {
		const enPath = resolveEnPathFromKoPath(koPath);
		if (!enPath || !fs.existsSync(koPath) || !fs.existsSync(enPath)) continue;
		const koContent = fs.readFileSync(koPath, "utf-8");
		const enContent = fs.readFileSync(enPath, "utf-8");
		const synced = syncEnglishContentForSlug(koPath, koContent, enContent);
		if (synced.changed && options.write) {
			fs.writeFileSync(enPath, synced.content, "utf-8");
			if (options.stage) stageFile(enPath);
		}
		outcomes.push({
			koPath,
			enPath,
			updated: synced.changed,
			reason: synced.reason,
		});
	}
	return outcomes;
}

function parseArgs(args: string[]): {
	mode: "staged" | "working";
	write: boolean;
	stage: boolean;
	paths: string[];
} {
	const mode = args.includes("--mode=working") ? "working" : "staged";
	const write = args.includes("--write");
	const stage = args.includes("--stage");
	const paths = args
		.filter((arg) => arg.startsWith("--path="))
		.map((arg) => arg.slice("--path=".length));
	return { mode, write, stage, paths };
}

function runCli() {
	const options = parseArgs(process.argv.slice(2));
	const outcomes = runSync(options);
	const touched = outcomes.length;
	const updated = outcomes.filter((item) => item.updated).length;
	process.stdout.write(
		`[post-localization-sync] touched=${touched} updated=${updated} mode=${options.mode}\n`,
	);
	for (const outcome of outcomes) {
		process.stdout.write(
			`- ${outcome.koPath} -> ${outcome.enPath} (${outcome.reason})\n`,
		);
	}
}

if (
	process.argv[1] &&
	path.basename(process.argv[1]) === "sync-post-localization.ts"
) {
	runCli();
}
