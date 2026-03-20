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
	blocks: {
		startMarker: string;
		endMarker: string;
		replacement: string;
	}[];
};

const KO_POST_PREFIX = "src/posts/ko/";
const MARKDOWN_FILE_REGEX = /\.md$/i;

const SECTION_RULES: SectionRule[] = [
	{
		slug: "2026-03-19-20",
		koAnchors: [
			"요구사항 입력\\",
			"의도 (고수준) → 제약 조건 (중간 표현) → 코드 (저수준)\\",
			"이 검증은 사후 리뷰가 아니다.\\",
			"다른 사용자의 ID로 요청을 보내는 경우:\\",
			"→ 즉시 반례로 탐지되고 코드 생성이 중단된다.\\",
			"Archright는 그 코드가 틀릴 수 없는 상태를 만든다.",
		],
		blocks: [
			{
				startMarker: "### 1. Thought Trajectory System: Freezing Intent",
				endMarker:
					"\n### 2. Nim Programming Language: A Trinity of Productivity, Performance, and Stability",
				replacement: [
					"### 1. Thought Trajectory System: Freezing Intent",
					"",
					"It freezes builder intent and context as durable records, like a GitHub commit log for reasoning.\\",
					"It fixes the architect's thought flow as explicit data so AI inference does not remain a black box.\\",
					"That creates transparent intent anyone can onboard from immediately, while slashing communication cost.",
					"",
					"This system is not a simple log.\\",
					"In Archright, intent is used through this flow:",
					"",
					"Requirements input\\",
					"→ Capture the architect's intent in a structured form\\",
					"→ Use it as the reference point across every generation/verification step\\",
					'→ Validate consistency against "intent," not just against code',
					"",
					"In short, code is only one output that must satisfy this intent.",
				].join("\n"),
			},
			{
				startMarker:
					"### 2. Nim Programming Language: A Trinity of Productivity, Performance, and Stability",
				endMarker: "\n### 3. Formal Verification: Mathematical Proof",
				replacement: [
					"### 2. Nim Programming Language: A Trinity of Productivity, Performance, and Stability",
					"",
					"Why Nim instead of Rust?\\",
					"Rust is excellent for performance and safety, but often sacrifices production velocity, and its less human-friendly syntax can become a major trigger for AI-agent hallucinations.\\",
					"Nim preserves performance and stability while delivering exceptional readability.\\",
					"It is the optimal choice for a high-efficiency engine where both agents and humans communicate with clarity.",
					"",
					"Language choice is not a matter of taste.\\",
					"In Archright's flow:",
					"",
					"Intent (high level) → Constraints (intermediate form) → Code (low level)\\",
					"these three layers must remain continuously connected.",
					"",
					"We chose a language that minimizes the cost of maintaining this connection.\\",
					'Rust is powerful at solving "is this code safe?".\\',
					"However, Archright addresses an earlier question:",
					'"is this code correct in the first place?"',
					"",
					"We chose a language that allows this question to be handled before compile-time output.\\",
					"Intent and constraints are verified first, before they are converted into code.",
				].join("\n"),
			},
			{
				startMarker: "### 3. Formal Verification: Mathematical Proof",
				endMarker:
					'\n<hr style="border: 0; border-top: 1px dashed #52525b; margin: 1.2rem 0;" />',
				replacement: [
					"### 3. Formal Verification: Mathematical Proof",
					"",
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
					"“A user must only be allowed to read their own data” as a security condition means,\\",
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
			{
				startMarker: "## Reclaiming the Joy of Building",
				endMarker: "",
				replacement: [
					"## Reclaiming the Joy of Building",
					"",
					"On top of these three pillars, engineers are no longer janitors cleaning up AI-generated trash.\\",
					"They step away from tedious debugging and communication bottlenecks, and return as builders focused only on business-logic design and creative architecture.",
					"",
					"AI writes code.\\",
					"Archright creates a state where that code cannot be wrong.",
					"",
					"That is exactly the new software-engineering standard Archright proposes, and the reason I began this journey.",
				].join("\n"),
			},
		],
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

function replaceBetweenMarkers(
	enContent: string,
	startMarker: string,
	endMarker: string,
	replacement: string,
) {
	const startIndex = enContent.indexOf(startMarker);
	if (startIndex < 0) return { changed: false, content: enContent };
	const endIndex =
		endMarker.length > 0
			? enContent.indexOf(endMarker, startIndex + startMarker.length)
			: enContent.length;
	if (endIndex < 0) return { changed: false, content: enContent };
	const existingBlock = enContent.slice(startIndex, endIndex);
	const normalizedReplacement = `${replacement}\n`;
	if (existingBlock === normalizedReplacement) {
		return { changed: false, content: enContent };
	}
	const nextContent = `${enContent.slice(0, startIndex)}${normalizedReplacement}${enContent.slice(endIndex)}`;
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
	let replacedContent = enContent;
	let changed = false;
	for (const block of rule.blocks) {
		const replaced = replaceBetweenMarkers(
			replacedContent,
			block.startMarker,
			block.endMarker,
			block.replacement,
		);
		replacedContent = replaced.content;
		changed = changed || replaced.changed;
	}
	return {
		changed,
		content: replacedContent,
		reason: changed ? ("patched" as const) : ("already-synced" as const),
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
