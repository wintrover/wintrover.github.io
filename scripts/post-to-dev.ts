import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import matter from "gray-matter";
import { logError, logWarn } from "../src/lib/log";
import { processMermaidDiagrams } from "./image-tools";

type Frontmatter = Record<string, unknown> & {
	title?: string;
	date?: string;
	excerpt?: string;
	description?: string;
	canonical_url?: string;
	cover_image?: string;
	tags?: string | string[];
};

type DevToArticleSummary = {
	id: number;
	title: string;
};

type DevToArticleResponse = {
	url?: string;
};

type Platform = "devto" | "linkedin";

type PublishState = "success" | "failed" | "skipped" | "unknown";

type DeploymentRecord = {
	slug: string;
	platform: Platform;
	state: PublishState;
	updatedAt: string;
	detail: string;
	postPath: string;
};

type PreparedPost = {
	slug: string;
	filePath: string;
	title: string;
	description?: string;
	canonicalUrl: string;
	tags: string[];
	bodyMarkdown: string;
	firstImageUrl: string | null;
};

type LinkedInProfileResponse = {
	id?: string;
};

const STATE_DATA_ROOT = path.resolve(process.env.STATE_DATA_ROOT || ".");
const DEPLOY_ROOT = path.join(STATE_DATA_ROOT, ".deploy");
const DEPLOY_LOCK = path.join(DEPLOY_ROOT, "lock");
const STATUS_SNAPSHOT_PATH = path.join(STATE_DATA_ROOT, "STATUS.md");
const DEFAULT_PUBLIC_BASE_URL = "https://wintrover.github.io/";
const DEFAULT_LINKEDIN_PERSON_URN = "urn:li:person:binfyrHJAK";
const DEFAULT_LINKEDIN_VERSION = "202502";
const LINKEDIN_POSTS_API_URL = normalizeLinkedInPostsApiUrl(
	process.env.LINKEDIN_POSTS_API_URL || "https://api.linkedin.com/rest/posts",
);
const SUPPORTED_PLATFORMS: Platform[] = ["devto", "linkedin"];
export const DEPLOY_POSTS_ROOT_RELATIVE = "content/posts";
const DEPLOY_POSTS_ROOT = path.resolve(
	process.cwd(),
	DEPLOY_POSTS_ROOT_RELATIVE,
);

function normalizeLinkedInVersion(rawVersion: string) {
	const trimmed = rawVersion.trim();
	if (/^\d{6}(\.\d{2})?$/.test(trimmed)) return trimmed;
	if (/^\d{8}$/.test(trimmed)) return trimmed.slice(0, 6);
	return DEFAULT_LINKEDIN_VERSION;
}

function normalizeLinkedInPostsApiUrl(rawUrl: string) {
	try {
		const url = new URL(rawUrl.trim());
		url.pathname = "/rest/posts";
		url.search = "";
		return url.toString();
	} catch {
		return "https://api.linkedin.com/rest/posts";
	}
}

function normalizePublicBaseUrl(url: string) {
	try {
		if (typeof url !== "string" || !url) return DEFAULT_PUBLIC_BASE_URL;
		const trimmed = url.trim().replace(/["']/g, "");
		const u = new URL(
			trimmed.startsWith("http")
				? trimmed
				: `https://${trimmed.replace(/^\/*/, "")}`,
		);
		if (!u.pathname.endsWith("/")) {
			u.pathname = `${u.pathname}/`;
		}
		return u.toString();
	} catch {
		return DEFAULT_PUBLIC_BASE_URL;
	}
}

function slugifyTitle(title: string) {
	return String(title)
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

export function absolutizeSrc(src: string, publicBaseUrl: string): string;
export function absolutizeSrc<T>(src: T, publicBaseUrl: string): T;
export function absolutizeSrc(src: unknown, publicBaseUrl: string) {
	try {
		if (typeof src !== "string" || !src) return src;
		const trimmed = src.trim().replace(/^["']|["']$/g, "");
		if (
			trimmed.includes("ufileos.com") ||
			trimmed.includes("UCloudPublicKey") ||
			trimmed.includes("signature=") ||
			trimmed.includes("Expires=")
		) {
			console.warn(
				`⚠️ UCloud temporary URL detected: ${trimmed.substring(0, 100)}...`,
			);
			console.warn(
				"   This URL may not render on Dev.to. Consider downloading and hosting the image publicly.",
			);
			return trimmed;
		}
		if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:"))
			return trimmed;
		const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
		const base = new URL(baseUrl);
		if (
			/^(?:public\/)?images\//.test(trimmed) ||
			/^(?:\/)(?:public\/)?images\//.test(trimmed) ||
			/^blog\/images\//.test(trimmed) ||
			/^\/blog\/images\//.test(trimmed)
		) {
			let assetPath = trimmed;
			if (assetPath.startsWith("public/")) {
				assetPath = assetPath.substring(7);
			}
			assetPath = assetPath.replace(/\\/g, "/");
			assetPath = assetPath.replace(/^\//, "");
			if (assetPath.startsWith("blog/")) {
				assetPath = assetPath.substring(5);
			}
			const basePath = base.pathname.replace(/\/$/, "");
			const abs = `${base.origin}${basePath}/${assetPath}`;
			return abs;
		}
		let assetPath = trimmed;
		const mBlogAssets = trimmed.match(/(?:^|\/)(blog\/assets\/[^?#\s)]+)/i);
		const mAssets = trimmed.match(/(?:^|\/)(assets\/[^?#\s)]+)/i);
		const mImages = trimmed.match(/(?:^|\/)(images\/[^?#\s)]+)/i);
		if (mBlogAssets) {
			assetPath = mBlogAssets[1].replace(/^blog\//i, "");
		} else if (mAssets) {
			assetPath = mAssets[1];
		} else if (mImages) {
			assetPath = mImages[1];
		} else {
			assetPath = trimmed.replace(/^\.{1,2}\//, "").replace(/^blog\//i, "");
		}
		if (/^assets\/images\//i.test(assetPath)) {
			const rest = assetPath.replace(/^assets\/images\//i, "");
			const parts = rest.split("/");
			if (parts.length >= 2 && /^\d{2}$/.test(parts[0])) {
				assetPath = `images/${parts[0]}-${parts.slice(1).join("/")}`;
			} else {
				assetPath = `images/${parts.slice(1).join("/") || parts[0]}`;
			}
		}
		const useRaw =
			String(process.env.BLOG_IMAGE_ABS_MODE || "").toLowerCase() === "raw";
		const ghRepo = process.env.GITHUB_REPOSITORY;
		if (useRaw && ghRepo) {
			let repoPath = assetPath.replace(/^\/+/, "");
			if (!repoPath.startsWith("public/")) {
				repoPath = `public/${repoPath}`;
			}
			return `https://raw.githubusercontent.com/${ghRepo}/refs/heads/main/${repoPath}`;
		}
		const p = `/${assetPath.replace(/^\/+/, "").replace(/^blog\//i, "")}`;
		const abs = new URL(p, base).toString();
		return abs;
	} catch {
		return src;
	}
}

export async function absolutizeImagesInMarkdown(
	markdown: string,
	publicBaseUrl: string,
	firstImageRef: { url: string | null },
) {
	let out = markdown;

	// Handle <img> tags
	const imgRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi;
	const imgMatches = [...out.matchAll(imgRegex)];
	for (const match of imgMatches) {
		const [fullMatch, pre, src, post] = match;
		let abs = src;
		if (isUCloudUrl(src)) {
			abs = await downloadAndHostUCloudImage(src, publicBaseUrl);
		} else {
			abs = absolutizeSrc(src, publicBaseUrl);
		}
		if (!firstImageRef.url) firstImageRef.url = abs;
		out = out.replace(fullMatch, `<img ${pre}src="${abs}"${post}>`);
	}

	// Handle markdown images ![]()
	const markdownImageRegex = /!\[([^\]]*)\]\((\s*<?([^)\s]+)>?)([^)]*)\)/g;
	const matches = [...out.matchAll(markdownImageRegex)];
	for (const match of matches) {
		const [fullMatch, alt, _urlPart, urlOnly, rest] = match;
		let abs = urlOnly;
		if (isUCloudUrl(urlOnly)) {
			abs = await downloadAndHostUCloudImage(urlOnly, publicBaseUrl);
		} else {
			abs = absolutizeSrc(urlOnly, publicBaseUrl);
		}
		if (!firstImageRef.url) firstImageRef.url = abs;
		const restOut = rest || "";
		out = out.replace(fullMatch, `![${alt}](${abs}${restOut})`);
	}
	return out;
}

function clampTitle(title: string) {
	if (!title) return "";
	return title.length <= 128 ? title : `${title.slice(0, 125)}...`;
}

function toTags(rawTags: Frontmatter["tags"]) {
	const normalizedTags = Array.isArray(rawTags)
		? rawTags
		: typeof rawTags === "string"
			? rawTags.split(/[,\s]+/).filter(Boolean)
			: [];
	const sanitized = Array.from(
		new Set(
			normalizedTags
				.map((t: unknown) =>
					String(t)
						.toLowerCase()
						.replace(/[^a-z0-9]/g, ""),
				)
				.filter(Boolean),
		),
	);
	return sanitized.slice(0, 4);
}

function sanitizeTextForLinkedIn(text: string) {
	return text
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]+`/g, " ")
		.replace(/!\[[^\]]*]\(([^)]+)\)/g, "$1")
		.replace(/\[[^\]]+]\(([^)]+)\)/g, "$1")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeLinkedInPersonUrn(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("urn:li:person:")) return trimmed;
	return `urn:li:person:${trimmed}`;
}

async function resolveLinkedInPersonUrn(
	accessToken: string,
	fallbackUrn: string,
) {
	const configuredUrn = normalizeLinkedInPersonUrn(fallbackUrn);
	const linkedInVersion = normalizeLinkedInVersion(
		process.env.LINKEDIN_VERSION ||
			process.env.LINKEDIN_API_VERSION ||
			DEFAULT_LINKEDIN_VERSION,
	);
	const readProfile = async (includeVersionHeader: boolean) => {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			"X-Restli-Protocol-Version": "2.0.0",
		};
		if (includeVersionHeader) {
			headers["Linkedin-Version"] = linkedInVersion;
		}
		const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
			method: "GET",
			headers,
		});
		if (!profileResponse.ok) {
			const errorPayload = await profileResponse.text();
			return {
				ok: false,
				errorPayload,
				status: profileResponse.status,
				profileUrn: "",
			};
		}
		const profile = (await profileResponse.json()) as LinkedInProfileResponse;
		const profileUrn =
			typeof profile.id === "string" && profile.id.trim()
				? `urn:li:person:${profile.id.trim()}`
				: "";
		return {
			ok: true,
			errorPayload: "",
			status: profileResponse.status,
			profileUrn,
		};
	};
	try {
		let profileResult = await readProfile(true);
		if (!profileResult.ok && /NO_VERSION/i.test(profileResult.errorPayload)) {
			profileResult = await readProfile(false);
		}
		if (profileResult.ok && profileResult.profileUrn) {
			return profileResult.profileUrn;
		}
		if (!profileResult.ok) {
			logWarn(
				"post-to-dev",
				"LinkedIn profile lookup failed, fallback URN is used",
				{
					status: profileResult.status,
					errorPayload: profileResult.errorPayload,
				},
			);
		}
	} catch (error) {
		logWarn(
			"post-to-dev",
			"LinkedIn profile lookup threw error, fallback URN is used",
			{
				error,
			},
		);
	}
	if (configuredUrn) return configuredUrn;
	return DEFAULT_LINKEDIN_PERSON_URN;
}

export function buildLinkedInPostsPayload(
	post: PreparedPost,
	authorUrn: string,
) {
	const bodyLines = [
		post.title,
		post.description || "",
		post.canonicalUrl,
		post.firstImageUrl || "",
	].filter(Boolean);
	return {
		author:
			normalizeLinkedInPersonUrn(authorUrn) || DEFAULT_LINKEDIN_PERSON_URN,
		commentary: sanitizeTextForLinkedIn(bodyLines.join("\n\n")),
		visibility: "PUBLIC",
		distribution: {
			feedDistribution: "MAIN_FEED",
			targetEntities: [],
			thirdPartyDistributionChannels: [],
		},
		lifecycleState: "PUBLISHED",
		isReshareDisabledByAuthor: false,
	};
}

async function preparePost(filePath: string, publicBaseUrl: string) {
	const markdownWithMeta = await fs.readFile(filePath, "utf-8");
	const { data: frontmatter, content } = matter(markdownWithMeta);
	const typedFrontmatter = frontmatter as Frontmatter;
	const tags = toTags(typedFrontmatter.tags);
	const mermaidOutputDir = path.join("public", "images");
	const baseName = path.basename(filePath, path.extname(filePath));
	const m = baseName.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d+))?/);
	const datePart = m?.[1] || String(typedFrontmatter.date || "");
	const numPart = m?.[2] || "0";
	const filenameBase = `${datePart}-${numPart}`;
	const { content: processedContent } = await processMermaidDiagrams(
		content,
		publicBaseUrl,
		mermaidOutputDir,
		filenameBase,
	);
	const firstImageRef = { url: null as string | null };
	const bodyMarkdown = await absolutizeImagesInMarkdown(
		processedContent,
		publicBaseUrl,
		firstImageRef,
	);
	const titleRaw =
		String(typedFrontmatter.title || "").trim() ||
		path.basename(filePath, path.extname(filePath));
	const slug = path.basename(filePath, path.extname(filePath));
	const canonicalUrl =
		String(typedFrontmatter.canonical_url || "").trim() ||
		`${publicBaseUrl}post/${slugifyTitle(titleRaw)}/`;
	const descriptionRaw =
		String(
			typedFrontmatter.excerpt || typedFrontmatter.description || "",
		).trim() || undefined;
	const coverImage =
		typeof typedFrontmatter.cover_image === "string" &&
		typedFrontmatter.cover_image
			? absolutizeSrc(typedFrontmatter.cover_image, publicBaseUrl)
			: firstImageRef.url;
	return {
		slug,
		filePath,
		title: clampTitle(titleRaw),
		description: descriptionRaw,
		canonicalUrl,
		tags,
		bodyMarkdown,
		firstImageUrl: coverImage,
	} satisfies PreparedPost;
}

async function publishToDevto(post: PreparedPost, apiKey: string) {
	const article = {
		title: post.title,
		published: false,
		body_markdown: post.bodyMarkdown,
		tags: post.tags,
		description: post.description,
		canonical_url: post.canonicalUrl,
		cover_image: post.firstImageUrl || undefined,
	};
	const checkResponse = await fetch(
		"https://dev.to/api/articles/me/all?per_page=1000",
		{
			headers: { "api-key": apiKey },
		},
	);
	let existingId: number | null = null;
	if (checkResponse.ok) {
		const rawArticles = await checkResponse.json();
		const articles = Array.isArray(rawArticles)
			? rawArticles.filter(
					(v): v is DevToArticleSummary =>
						typeof v === "object" &&
						v !== null &&
						typeof (v as DevToArticleSummary).id === "number" &&
						typeof (v as DevToArticleSummary).title === "string",
				)
			: [];
		const found = articles.find((a) => a.title === article.title);
		if (found) existingId = found.id;
	}
	const response = existingId
		? await fetch(`https://dev.to/api/articles/${existingId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/vnd.forem.api-v1+json",
					"api-key": apiKey,
				},
				body: JSON.stringify({ article }),
			})
		: await fetch("https://dev.to/api/articles", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/vnd.forem.api-v1+json",
					"api-key": apiKey,
				},
				body: JSON.stringify({ article }),
			});
	if (!response.ok) {
		const errorPayload = await response.text();
		throw new Error(`DEV.to API failed (${response.status}): ${errorPayload}`);
	}
	const result = (await response.json()) as DevToArticleResponse;
	return {
		url: result.url || "",
		detail: existingId ? "updated" : "created",
	};
}

async function publishToLinkedIn(
	post: PreparedPost,
	accessToken: string,
	personUrn: string,
) {
	const payload = buildLinkedInPostsPayload(post, personUrn);
	const linkedInVersion = normalizeLinkedInVersion(
		process.env.LINKEDIN_VERSION ||
			process.env.LINKEDIN_API_VERSION ||
			DEFAULT_LINKEDIN_VERSION,
	);
	const response = await fetch(LINKEDIN_POSTS_API_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			"X-Restli-Protocol-Version": "2.0.0",
			"Linkedin-Version": linkedInVersion,
		},
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const errorPayload = await response.text();
		throw new Error(
			`LinkedIn API failed (${response.status}): ${errorPayload}`,
		);
	}
	return {
		url: post.canonicalUrl,
		detail: `published:${payload.author}`,
	};
}

function statusPaths(slug: string, platform: Platform) {
	const baseDir = path.join(DEPLOY_ROOT, slug);
	return {
		baseDir,
		status: path.join(baseDir, `${platform}.status`),
		success: path.join(baseDir, `${platform}.success`),
		failed: path.join(baseDir, `${platform}.failed`),
	};
}

async function fileExists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export function evaluateDeploymentDecision(
	hasSuccessMarker: boolean,
	hasFailedMarker: boolean,
) {
	if (hasSuccessMarker) return "skip";
	if (hasFailedMarker) return "attempt";
	return "attempt";
}

async function writePlatformStatus(
	record: DeploymentRecord,
	skipWriteMarkers: boolean,
) {
	const paths = statusPaths(record.slug, record.platform);
	await fs.mkdir(paths.baseDir, { recursive: true });
	await fs.writeFile(
		paths.status,
		JSON.stringify(
			{
				state: record.state,
				updatedAt: record.updatedAt,
				detail: record.detail,
				postPath: record.postPath,
			},
			null,
			2,
		),
	);
	if (skipWriteMarkers) return;
	if (record.state === "success") {
		await fs.rm(paths.failed, { force: true });
		await fs.writeFile(
			paths.success,
			JSON.stringify(
				{
					state: record.state,
					updatedAt: record.updatedAt,
					detail: record.detail,
					postPath: record.postPath,
				},
				null,
				2,
			),
		);
	}
	if (record.state === "failed") {
		await fs.rm(paths.success, { force: true });
		await fs.writeFile(
			paths.failed,
			JSON.stringify(
				{
					state: record.state,
					updatedAt: record.updatedAt,
					detail: record.detail,
					postPath: record.postPath,
				},
				null,
				2,
			),
		);
	}
}

function summarizeState(state: PublishState) {
	if (state === "success") return "✅ success";
	if (state === "failed") return "❌ failed";
	if (state === "skipped") return "⏭️ skipped";
	return "⚪ unknown";
}

export function buildStatusMarkdown(records: DeploymentRecord[]) {
	const grouped = new Map<
		string,
		{
			devto: PublishState;
			linkedin: PublishState;
			updatedAt: string;
		}
	>();
	for (const record of records) {
		const prev = grouped.get(record.slug) || {
			devto: "unknown",
			linkedin: "unknown",
			updatedAt: record.updatedAt,
		};
		if (record.platform === "devto") prev.devto = record.state;
		if (record.platform === "linkedin") prev.linkedin = record.state;
		if (record.updatedAt > prev.updatedAt) prev.updatedAt = record.updatedAt;
		grouped.set(record.slug, prev);
	}
	const rows = [...grouped.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([slug, status]) =>
				`| ${slug} | ${summarizeState(status.devto)} | ${summarizeState(status.linkedin)} | ${status.updatedAt} |`,
		);
	return [
		"# SNS Deployment Status",
		"",
		"| Post Slug | Dev.to | LinkedIn | Updated At |",
		"| --- | --- | --- | --- |",
		...rows,
		"",
	].join("\n");
}

function toWorkspaceRelative(filePath: string) {
	const relative = path.relative(process.cwd(), filePath);
	return relative.replace(/\\/g, "/");
}

export function buildDeploymentInputSnapshotMarkdown(
	scannedRoot: string,
	candidateFiles: string[],
) {
	const root = toWorkspaceRelative(scannedRoot);
	const rows = candidateFiles
		.map((candidate) => toWorkspaceRelative(candidate))
		.sort((a, b) => a.localeCompare(b))
		.map((candidate) => `| ${candidate} |`);
	return [
		"## Deployment Input Snapshot",
		"",
		"| Scanned Root |",
		"| --- |",
		`| ${root} |`,
		"",
		"| Candidate File |",
		"| --- |",
		...rows,
		"",
	].join("\n");
}

export function buildDeploymentInputSnapshotLog(
	scannedRoot: string,
	candidateFiles: string[],
) {
	const root = toWorkspaceRelative(scannedRoot);
	const candidates = candidateFiles
		.map((candidate) => toWorkspaceRelative(candidate))
		.sort((a, b) => a.localeCompare(b));
	return [
		`[deploy-input] scanned-root=${root}`,
		...candidates.map((candidate) => `[deploy-input] candidate=${candidate}`),
		"",
	].join("\n");
}

async function writeGithubSummary(
	records: DeploymentRecord[],
	scannedRoot: string,
	candidateFiles: string[],
) {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (!summaryPath) return;
	const snapshotMarkdown = buildDeploymentInputSnapshotMarkdown(
		scannedRoot,
		candidateFiles,
	);
	const lines = [
		snapshotMarkdown,
		"## SNS Deployment Result",
		"",
		"| Post | Platform | State | Detail |",
		"| --- | --- | --- | --- |",
		...records.map(
			(record) =>
				`| ${record.slug} | ${record.platform} | ${summarizeState(record.state)} | ${record.detail.replace(/\|/g, "\\|")} |`,
		),
		"",
	];
	await fs.appendFile(summaryPath, lines.join("\n"));
}

async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				return collectMarkdownFiles(fullPath);
			}
			if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
			return [];
		}),
	);
	return nested.flat();
}

function isPathInsideDeployPostsRoot(resolvedPath: string) {
	const relative = path.relative(DEPLOY_POSTS_ROOT, resolvedPath);
	return (
		relative === "" ||
		(!relative.startsWith("..") && !path.isAbsolute(relative))
	);
}

export async function discoverPostFiles(targetInput?: string) {
	const effectiveTarget = targetInput
		? path.resolve(targetInput)
		: DEPLOY_POSTS_ROOT;
	if (!isPathInsideDeployPostsRoot(effectiveTarget)) {
		throw new Error(
			`Deployment target must be inside ${DEPLOY_POSTS_ROOT_RELATIVE}: ${effectiveTarget}`,
		);
	}
	const stat = await fs.stat(effectiveTarget);
	if (stat.isDirectory()) {
		return collectMarkdownFiles(effectiveTarget);
	}
	if (!effectiveTarget.toLowerCase().endsWith(".md")) {
		throw new Error(
			`Deployment target must be a markdown file: ${effectiveTarget}`,
		);
	}
	return [effectiveTarget];
}

function parsePlatforms(raw?: string): Platform[] {
	const normalized = String(raw || "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const values = normalized.length > 0 ? normalized : SUPPORTED_PLATFORMS;
	const filtered = values.filter((v): v is Platform =>
		SUPPORTED_PLATFORMS.includes(v as Platform),
	);
	if (filtered.length === 0) return SUPPORTED_PLATFORMS;
	return Array.from(new Set(filtered));
}

async function loadCurrentStatus(slugs: string[]) {
	const records: DeploymentRecord[] = [];
	for (const slug of slugs) {
		for (const platform of SUPPORTED_PLATFORMS) {
			const paths = statusPaths(slug, platform);
			const successExists = await fileExists(paths.success);
			const failedExists = await fileExists(paths.failed);
			let state: PublishState = "unknown";
			if (successExists) state = "success";
			else if (failedExists) state = "failed";
			let detail = "n/a";
			try {
				const raw = await fs.readFile(paths.status, "utf-8");
				const parsed = JSON.parse(raw) as { detail?: string };
				if (parsed.detail) detail = parsed.detail;
			} catch {
				detail = "n/a";
			}
			records.push({
				slug,
				platform,
				state,
				updatedAt: new Date().toISOString(),
				detail,
				postPath: "",
			});
		}
	}
	return records;
}

async function updateStatusSnapshot(slugs: string[]) {
	const snapshotRecords = await loadCurrentStatus(slugs);
	const markdown = buildStatusMarkdown(snapshotRecords);
	await fs.mkdir(path.dirname(STATUS_SNAPSHOT_PATH), { recursive: true });
	await fs.writeFile(STATUS_SNAPSHOT_PATH, markdown, "utf-8");
}

async function acquireSoftLock() {
	await fs.mkdir(DEPLOY_ROOT, { recursive: true });
	if (await fileExists(DEPLOY_LOCK)) {
		throw new Error(
			"Soft lock exists at .deploy/lock. Another deployment run is in progress.",
		);
	}
	await fs.writeFile(
		DEPLOY_LOCK,
		JSON.stringify(
			{
				pid: process.pid,
				runId: process.env.GITHUB_RUN_ID || "local",
				createdAt: new Date().toISOString(),
			},
			null,
			2,
		),
	);
}

async function releaseSoftLock() {
	await fs.rm(DEPLOY_LOCK, { force: true });
}

async function attemptPublish(post: PreparedPost, platform: Platform) {
	const updatedAt = new Date().toISOString();
	const paths = statusPaths(post.slug, platform);
	const hasSuccess = await fileExists(paths.success);
	const hasFailed = await fileExists(paths.failed);
	const decision = evaluateDeploymentDecision(hasSuccess, hasFailed);
	if (decision === "skip") {
		const record: DeploymentRecord = {
			slug: post.slug,
			platform,
			state: "skipped",
			updatedAt,
			detail: "success marker exists",
			postPath: post.filePath,
		};
		await writePlatformStatus(record, true);
		return record;
	}
	try {
		if (platform === "devto") {
			const apiKey = process.env.DEVTO_API_KEY;
			if (!apiKey) throw new Error("DEVTO_API_KEY is not set");
			const result = await publishToDevto(post, apiKey);
			const record: DeploymentRecord = {
				slug: post.slug,
				platform,
				state: "success",
				updatedAt,
				detail: `${result.detail}${result.url ? `: ${result.url}` : ""}`,
				postPath: post.filePath,
			};
			await writePlatformStatus(record, false);
			return record;
		}
		const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
		const configuredUrn =
			process.env.LINKEDIN_PERSON_URN || DEFAULT_LINKEDIN_PERSON_URN;
		if (!accessToken) throw new Error("LINKEDIN_ACCESS_TOKEN is not set");
		const personUrn = await resolveLinkedInPersonUrn(
			accessToken,
			configuredUrn,
		);
		const result = await publishToLinkedIn(post, accessToken, personUrn);
		const record: DeploymentRecord = {
			slug: post.slug,
			platform,
			state: "success",
			updatedAt,
			detail: `${result.detail}${result.url ? `: ${result.url}` : ""}`,
			postPath: post.filePath,
		};
		await writePlatformStatus(record, false);
		return record;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const record: DeploymentRecord = {
			slug: post.slug,
			platform,
			state: "failed",
			updatedAt,
			detail: message,
			postPath: post.filePath,
		};
		await writePlatformStatus(record, false);
		return record;
	}
}

async function runDeployment(targetInput?: string, platformsArg?: string) {
	const publicBaseUrl = normalizePublicBaseUrl(
		process.env.BLOG_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL,
	);
	const scannedRoot = targetInput
		? path.resolve(targetInput)
		: DEPLOY_POSTS_ROOT;
	const postFiles = await discoverPostFiles(targetInput);
	const allPostFiles = await discoverPostFiles();
	if (postFiles.length === 0) {
		throw new Error("No markdown files found for deployment.");
	}
	const platforms = parsePlatforms(
		platformsArg || process.env.DEPLOY_PLATFORMS,
	);
	process.stdout.write(buildDeploymentInputSnapshotLog(scannedRoot, postFiles));
	const records: DeploymentRecord[] = [];
	await acquireSoftLock();
	try {
		for (const filePath of postFiles) {
			const prepared = await preparePost(filePath, publicBaseUrl);
			for (const platform of platforms) {
				const record = await attemptPublish(prepared, platform);
				records.push(record);
			}
		}
		await writeGithubSummary(records, scannedRoot, postFiles);
		await updateStatusSnapshot(
			allPostFiles.map((filePath) => path.basename(filePath, ".md")),
		);
		const hasFailed = records.some((r) => r.state === "failed");
		if (hasFailed) {
			logWarn("post-to-dev", "Some platform deployments failed.", {
				failedCount: records.filter((r) => r.state === "failed").length,
			});
		}
		return records;
	} finally {
		await releaseSoftLock();
	}
}

async function downloadAndHostUCloudImage(
	ucloudUrl: string,
	publicBaseUrl: string,
) {
	try {
		const cryptoMod = await import("node:crypto");
		const urlHash = cryptoMod.createHash("md5").update(ucloudUrl).digest("hex");
		const filename = `ucloud-${urlHash}.png`;
		const outputPath = path.join("public", "images", filename);
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		const response = await fetch(ucloudUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}
		const buffer = await response.arrayBuffer();
		await fs.writeFile(outputPath, Buffer.from(buffer));
		const gitRemote = await getGitHubRepoInfo();
		if (gitRemote) {
			const { owner, repo } = gitRemote;
			const normalizedPath = `public/images/${filename}`.replace(/\\/g, "/");
			return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${normalizedPath}`;
		}
		const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
		return `${baseUrl}/images/${filename}`;
	} catch (error: unknown) {
		logError("post-to-dev", "Failed to process UCloud image", {
			ucloudUrl,
			error,
		});
		return ucloudUrl;
	}
}

async function getGitHubRepoInfo() {
	try {
		const { exec } = await import("node:child_process");
		const util = await import("node:util");
		const execAsync = util.promisify(exec);
		const { stdout: remoteUrl } = await execAsync("git remote get-url origin");
		const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?/i);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
		return null;
	} catch (_error) {
		return null;
	}
}

function isUCloudUrl(url: string) {
	return (
		url.includes("ufileos.com") ||
		url.includes("UCloudPublicKey") ||
		url.includes("signature=") ||
		url.includes("Expires=")
	);
}

if (process.argv[1] && path.basename(process.argv[1]) === "post-to-dev.ts") {
	dotenv.config({ path: ".env.local" });
	const targetInput = process.argv[2];
	const platformsArg = process.argv[3];
	runDeployment(targetInput, platformsArg).catch((error) => {
		logError("post-to-dev", "An error occurred", { error });
		process.exit(1);
	});
}
