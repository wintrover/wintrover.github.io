import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import matter from "gray-matter";
import { logError, logWarn } from "../src/lib/log";
import { slugify } from "../src/lib/utils";
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
	id?: number;
	url?: string;
};

type Platform = "devto" | "linkedin";

type PublishState = "success" | "failed" | "skipped" | "unknown";

type DeploymentRecord = {
	slug: string;
	postKey: string;
	platform: Platform;
	state: PublishState;
	updatedAt: string;
	detail: string;
	postPath: string;
	externalPostId?: string;
	externalPostUrl?: string;
};

type PersistedPlatformStatus = {
	state?: PublishState;
	updatedAt?: string;
	detail?: string;
	postPath?: string;
	postKey?: string;
	externalPostId?: string;
	externalPostUrl?: string;
};

export type PreparedPost = {
	slug: string;
	postKey: string;
	filePath: string;
	title: string;
	description?: string;
	linkedInIntro: string;
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
const DEFAULT_LINKEDIN_VERSION = "202603";
const LINKEDIN_POSTS_API_URL = normalizeLinkedInPostsApiUrl(
	process.env.LINKEDIN_POSTS_API_URL || "https://api.linkedin.com/rest/posts",
);
const SUPPORTED_PLATFORMS: Platform[] = ["devto", "linkedin"];
const DEFAULT_PLATFORMS: Platform[] = ["devto"];

export function isLinkedInAutoPostEnabled() {
	return /^(1|true|yes|on)$/i.test(
		String(process.env.LINKEDIN_AUTOPOST_ENABLED || "").trim(),
	);
}

export const DEPLOY_POSTS_ROOT_RELATIVE = "src/posts";
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

export function isLinkedInDryRunEnabled(raw?: string) {
	const normalized = String(raw || "")
		.trim()
		.toLowerCase();
	return (
		normalized === "1" ||
		normalized === "true" ||
		normalized === "yes" ||
		normalized === "on"
	);
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

export function resolveCanonicalSlug(filePath: string, title: string) {
	const fallbackSlug = path.basename(filePath, path.extname(filePath));
	const titleSlug = slugify(String(title || ""));
	return titleSlug || fallbackSlug;
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

function buildLinkedInCommentary(intro: string, canonicalUrl: string) {
	const introLine = sanitizeTextForLinkedIn(intro);
	const linkLine = sanitizeTextForLinkedIn(canonicalUrl);
	return [introLine, linkLine].filter(Boolean).join("\n\n");
}

function resolveLinkedInIntro(fallbackDescription: string | undefined) {
	const fallbackIntro =
		"I shared a new post about engineering decisions and quality automation. Read it here.";
	const normalizedIntro = sanitizeTextForLinkedIn(fallbackDescription || "");
	if (!normalizedIntro) return fallbackIntro;
	return normalizedIntro;
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
	return {
		author:
			normalizeLinkedInPersonUrn(authorUrn) || DEFAULT_LINKEDIN_PERSON_URN,
		commentary: buildLinkedInCommentary(post.linkedInIntro, post.canonicalUrl),
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
	const postKey = toPostKey(filePath);
	const canonicalSlug = resolveCanonicalSlug(filePath, titleRaw);
	const canonicalUrl =
		String(typedFrontmatter.canonical_url || "").trim() ||
		`${publicBaseUrl}post/${canonicalSlug}/`;
	const descriptionRaw =
		String(
			typedFrontmatter.excerpt || typedFrontmatter.description || "",
		).trim() || undefined;
	const linkedInIntro = resolveLinkedInIntro(descriptionRaw);
	const coverImage =
		typeof typedFrontmatter.cover_image === "string" &&
		typedFrontmatter.cover_image
			? absolutizeSrc(typedFrontmatter.cover_image, publicBaseUrl)
			: firstImageRef.url;
	return {
		slug,
		postKey,
		filePath,
		title: clampTitle(titleRaw),
		description: descriptionRaw,
		linkedInIntro,
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
	const postId = existingId ?? result.id;
	return {
		url: result.url || "",
		detail: existingId ? "updated" : "created",
		postId: typeof postId === "number" ? String(postId) : undefined,
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
	const publishRequest = async (
		url: string,
		versionHeaderName: "Linkedin-Version" | "LinkedIn-Version" | null,
	) => {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			"X-Restli-Protocol-Version": "2.0.0",
		};
		if (versionHeaderName) {
			headers[versionHeaderName] = linkedInVersion;
		}
		return fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});
	};
	const attempts: string[] = [];
	const attemptChain: {
		url: string;
		versionHeaderName: "Linkedin-Version" | "LinkedIn-Version" | null;
	}[] = [
		{ url: LINKEDIN_POSTS_API_URL, versionHeaderName: "Linkedin-Version" },
		{ url: LINKEDIN_POSTS_API_URL, versionHeaderName: "LinkedIn-Version" },
		{
			url: "https://api.linkedin.com/rest/posts",
			versionHeaderName: "Linkedin-Version",
		},
	];
	let response: Response | null = null;
	let errorPayload = "";
	for (const attempt of attemptChain) {
		response = await publishRequest(attempt.url, attempt.versionHeaderName);
		if (response.ok) {
			const restliId = response.headers.get("x-restli-id") || undefined;
			let responsePostId: string | undefined;
			try {
				const raw = (await response.json()) as { id?: string };
				if (typeof raw.id === "string" && raw.id) {
					responsePostId = raw.id;
				}
			} catch {
				responsePostId = undefined;
			}
			return {
				url: post.canonicalUrl,
				detail: `published:${payload.author}`,
				postId: restliId || responsePostId,
			};
		}
		errorPayload = await response.text();
		attempts.push(
			`header=${attempt.versionHeaderName ?? "none"},url=${attempt.url},status=${response.status},payload=${errorPayload}`,
		);
		const isVersionError = response.status === 400 || response.status === 426;
		if (
			!isVersionError ||
			!/(VERSION_MISSING|NONEXISTENT_VERSION|INVALID_VERSION)/i.test(
				errorPayload,
			)
		) {
			break;
		}
	}
	if (response) {
		throw new Error(
			`LinkedIn API failed (${response.status}): ${errorPayload}; attempts=${attempts.join(" || ")}`,
		);
	}
	return {
		url: post.canonicalUrl,
		detail: `published:${payload.author}`,
	};
}

function buildLinkedInDryRunPreview(
	post: PreparedPost,
	personUrn: string,
	linkedInVersion: string,
) {
	const payload = buildLinkedInPostsPayload(post, personUrn);
	return [
		"[linkedin-dry-run] publish skipped",
		`[linkedin-dry-run] canonical-url=${post.canonicalUrl}`,
		`[linkedin-dry-run] commentary=${payload.commentary}`,
		`[linkedin-dry-run] payload=${JSON.stringify(payload)}`,
		`[linkedin-dry-run] linkedin-version=${linkedInVersion}`,
		`[linkedin-dry-run] endpoint=${LINKEDIN_POSTS_API_URL}`,
		"",
	].join("\n");
}

function statusPaths(postKey: string, platform: Platform) {
	const baseDir = path.join(DEPLOY_ROOT, ...postKey.split("/"));
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

async function readPlatformStatus(filePath: string) {
	try {
		const raw = await fs.readFile(filePath, "utf-8");
		return JSON.parse(raw) as PersistedPlatformStatus;
	} catch {
		return null;
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
	const paths = statusPaths(record.postKey, record.platform);
	const payload = {
		state: record.state,
		updatedAt: record.updatedAt,
		detail: record.detail,
		postPath: record.postPath,
		postKey: record.postKey,
		externalPostId: record.externalPostId,
		externalPostUrl: record.externalPostUrl,
	};
	await fs.mkdir(paths.baseDir, { recursive: true });
	await fs.writeFile(paths.status, JSON.stringify(payload, null, 2));
	if (skipWriteMarkers) return;
	if (record.state === "success") {
		await fs.rm(paths.failed, { force: true });
		await fs.writeFile(paths.success, JSON.stringify(payload, null, 2));
	}
	if (record.state === "failed") {
		await fs.rm(paths.success, { force: true });
		await fs.writeFile(paths.failed, JSON.stringify(payload, null, 2));
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
		const prev = grouped.get(record.postKey) || {
			devto: "unknown",
			linkedin: "unknown",
			updatedAt: record.updatedAt,
		};
		if (record.platform === "devto") prev.devto = record.state;
		if (record.platform === "linkedin") prev.linkedin = record.state;
		if (record.updatedAt > prev.updatedAt) prev.updatedAt = record.updatedAt;
		grouped.set(record.postKey, prev);
	}
	const rows = [...grouped.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([postKey, status]) =>
				`| ${postKey} | ${summarizeState(status.devto)} | ${summarizeState(status.linkedin)} | ${status.updatedAt} |`,
		);
	return [
		"# SNS Deployment Status",
		"",
		"| Post Key | Dev.to | LinkedIn | Updated At |",
		"| --- | --- | --- | --- |",
		...rows,
		"",
	].join("\n");
}

function toWorkspaceRelative(filePath: string) {
	const relative = path.relative(process.cwd(), filePath);
	return relative.replace(/\\/g, "/");
}

export function toPostKey(filePath: string) {
	const relative = toWorkspaceRelative(filePath);
	const ext = path.extname(relative);
	const basename = path.basename(relative, ext).trim();
	if (!basename || basename.startsWith(".")) {
		throw new Error(
			`[REQ-DEPLOY-17] Invalid post path: ${filePath}. post_key must be basename only.`,
		);
	}
	return basename;
}

function slugFromPostKey(postKey: string) {
	return path.posix.basename(postKey);
}

function resolveMaxPublishPerRun() {
	const raw = process.env.MAX_PUBLISH_PER_RUN;
	if (!raw) return 1;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return 1;
	return Math.floor(parsed);
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
		"| Post Key | Platform | State | Detail |",
		"| --- | --- | --- | --- |",
		...records.map(
			(record) =>
				`| ${record.postKey} | ${record.platform} | ${summarizeState(record.state)} | ${record.detail.replace(/\|/g, "\\|")} |`,
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
				if (isPathInsideKoPostsRoot(fullPath)) return [];
				return collectMarkdownFiles(fullPath);
			}
			if (isPathInsideKoPostsRoot(fullPath)) return [];
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

function isPathInsideKoPostsRoot(resolvedPath: string) {
	const koRoot = path.join(DEPLOY_POSTS_ROOT, "ko");
	const relative = path.relative(koRoot, resolvedPath);
	return (
		relative === "" ||
		(!relative.startsWith("..") && !path.isAbsolute(relative))
	);
}

export async function discoverPostFiles(targetInput?: string) {
	if (!targetInput) {
		throw new Error(
			"Deployment target is required and must be a markdown file.",
		);
	}
	const effectiveTarget = path.resolve(targetInput);
	if (!isPathInsideDeployPostsRoot(effectiveTarget)) {
		throw new Error(
			`Deployment target must be inside ${DEPLOY_POSTS_ROOT_RELATIVE}: ${effectiveTarget}`,
		);
	}
	if (isPathInsideKoPostsRoot(effectiveTarget)) {
		throw new Error(
			`Deployment target must exclude ${path.join(DEPLOY_POSTS_ROOT_RELATIVE, "ko")}: ${effectiveTarget}`,
		);
	}
	const stat = await fs.stat(effectiveTarget);
	if (stat.isDirectory()) {
		throw new Error(
			`Deployment target must be a markdown file: ${effectiveTarget}`,
		);
	}
	if (!effectiveTarget.toLowerCase().endsWith(".md")) {
		throw new Error(
			`Deployment target must be a markdown file: ${effectiveTarget}`,
		);
	}
	return [effectiveTarget];
}

async function discoverAllDeployEligiblePostFiles() {
	return collectMarkdownFiles(DEPLOY_POSTS_ROOT);
}

export function parsePlatforms(raw?: string): Platform[] {
	const normalized = String(raw || "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const values = normalized.length > 0 ? normalized : DEFAULT_PLATFORMS;
	if (values.includes("linkedin") && !isLinkedInAutoPostEnabled()) {
		throw new Error(
			"LinkedIn auto-posting is disabled. Set LINKEDIN_AUTOPOST_ENABLED=true only for an explicitly approved manual run.",
		);
	}
	const filtered = values.filter((v): v is Platform =>
		SUPPORTED_PLATFORMS.includes(v as Platform),
	);
	if (filtered.length === 0) return DEFAULT_PLATFORMS;
	return Array.from(new Set(filtered));
}

async function loadCurrentStatus(postKeys: string[]) {
	const records: DeploymentRecord[] = [];
	for (const postKey of postKeys) {
		for (const platform of SUPPORTED_PLATFORMS) {
			const paths = statusPaths(postKey, platform);
			const successExists = await fileExists(paths.success);
			const failedExists = await fileExists(paths.failed);
			let state: PublishState = "unknown";
			if (successExists) state = "success";
			else if (failedExists) state = "failed";
			const parsed = await readPlatformStatus(paths.status);
			const detail = parsed?.detail || "n/a";
			records.push({
				slug: slugFromPostKey(postKey),
				postKey,
				platform,
				state,
				updatedAt: new Date().toISOString(),
				detail,
				postPath: "",
				externalPostId: parsed?.externalPostId,
				externalPostUrl: parsed?.externalPostUrl,
			});
		}
	}
	return records;
}

async function updateStatusSnapshot(postKeys: string[]) {
	const snapshotRecords = await loadCurrentStatus(postKeys);
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
	const paths = statusPaths(post.postKey, platform);
	const hasSuccess = await fileExists(paths.success);
	const hasFailed = await fileExists(paths.failed);
	const persisted = await readPlatformStatus(paths.status);
	const hasExternalPostIdentity = Boolean(
		persisted?.externalPostId || persisted?.externalPostUrl,
	);
	const hasPersistedSuccessWithExternalIdentity =
		persisted?.state === "success" && hasExternalPostIdentity;
	if (hasPersistedSuccessWithExternalIdentity) {
		const record: DeploymentRecord = {
			slug: post.slug,
			postKey: post.postKey,
			platform,
			state: "skipped",
			updatedAt,
			detail: "success status with external identity exists",
			postPath: post.filePath,
			externalPostId: persisted?.externalPostId,
			externalPostUrl: persisted?.externalPostUrl,
		};
		await writePlatformStatus(record, true);
		return record;
	}
	const decision = evaluateDeploymentDecision(hasSuccess, hasFailed);
	if (decision === "skip") {
		const record: DeploymentRecord = {
			slug: post.slug,
			postKey: post.postKey,
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
				postKey: post.postKey,
				platform,
				state: "success",
				updatedAt,
				detail: `${result.detail}${result.url ? `: ${result.url}` : ""}`,
				postPath: post.filePath,
				externalPostId: result.postId,
				externalPostUrl: result.url || undefined,
			};
			await writePlatformStatus(record, false);
			return record;
		}
		if (!isLinkedInAutoPostEnabled()) {
			const record: DeploymentRecord = {
				slug: post.slug,
				postKey: post.postKey,
				platform,
				state: "failed",
				updatedAt,
				detail:
					"LinkedIn auto-posting is disabled (LINKEDIN_AUTOPOST_ENABLED != true)",
				postPath: post.filePath,
			};
			await writePlatformStatus(record, false);
			return record;
		}
		const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
		const configuredUrn =
			process.env.LINKEDIN_PERSON_URN || DEFAULT_LINKEDIN_PERSON_URN;
		const linkedInVersion = normalizeLinkedInVersion(
			process.env.LINKEDIN_VERSION ||
				process.env.LINKEDIN_API_VERSION ||
				DEFAULT_LINKEDIN_VERSION,
		);
		const linkedInDryRun = isLinkedInDryRunEnabled(
			process.env.LINKEDIN_DRY_RUN,
		);
		if (linkedInDryRun) {
			process.stdout.write(
				buildLinkedInDryRunPreview(post, configuredUrn, linkedInVersion),
			);
			const record: DeploymentRecord = {
				slug: post.slug,
				postKey: post.postKey,
				platform,
				state: "skipped",
				updatedAt,
				detail: "linkedin dry-run preview only (not published)",
				postPath: post.filePath,
			};
			await writePlatformStatus(record, true);
			return record;
		}
		if (!accessToken) throw new Error("LINKEDIN_ACCESS_TOKEN is not set");
		const personUrn = await resolveLinkedInPersonUrn(
			accessToken,
			configuredUrn,
		);
		const result = await publishToLinkedIn(post, accessToken, personUrn);
		const record: DeploymentRecord = {
			slug: post.slug,
			postKey: post.postKey,
			platform,
			state: "success",
			updatedAt,
			detail: `${result.detail}${result.url ? `: ${result.url}` : ""}`,
			postPath: post.filePath,
			externalPostId: result.postId,
			externalPostUrl: result.url || undefined,
		};
		await writePlatformStatus(record, false);
		return record;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const record: DeploymentRecord = {
			slug: post.slug,
			postKey: post.postKey,
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

export async function runDeployment(
	targetInput?: string,
	platformsArg?: string,
) {
	if (
		!/^(1|true|yes|on)$/i.test(
			String(process.env.PUBLISH_LEGACY_ENABLED || "").trim(),
		)
	) {
		throw new Error(
			"Legacy publish path is disabled. Use --publish-one for an approved single-post publish.",
		);
	}
	const publicBaseUrl = normalizePublicBaseUrl(
		process.env.BLOG_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL,
	);
	const scannedRoot = targetInput
		? path.resolve(targetInput)
		: DEPLOY_POSTS_ROOT;
	const postFiles = await discoverPostFiles(targetInput);
	if (postFiles.length === 0) {
		throw new Error("No markdown files found for deployment.");
	}
	const maxPublishPerRun = resolveMaxPublishPerRun();
	if (postFiles.length > maxPublishPerRun) {
		throw new Error(
			`Candidate file count ${postFiles.length} exceeds MAX_PUBLISH_PER_RUN=${maxPublishPerRun}`,
		);
	}
	const platforms = parsePlatforms(
		platformsArg || process.env.DEPLOY_PLATFORMS,
	);
	process.stdout.write(buildDeploymentInputSnapshotLog(scannedRoot, postFiles));
	if (
		String(process.env.DEPLOY_PREFLIGHT_ONLY || "").toLowerCase() === "true"
	) {
		await writeGithubSummary([], scannedRoot, postFiles);
		return [];
	}
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
		const allPostFiles = await discoverAllDeployEligiblePostFiles();
		const allPostKeys = Array.from(
			new Set(allPostFiles.map((filePath) => toPostKey(filePath))),
		);
		await updateStatusSnapshot(allPostKeys);
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

export type DevtoArticle = {
	id: number;
	title?: string;
	description?: string;
	published?: boolean;
	published_at?: string | null;
	canonical_url?: string;
	url?: string;
	slug?: string;
	path?: string;
};

export type DevtoArticleSelection =
	| { kind: "none" }
	| { kind: "one"; article: DevtoArticle }
	| { kind: "ambiguous"; articles: DevtoArticle[] };

export type DevtoReconcileAction =
	| "create_draft"
	| "adopt_draft"
	| "already_published"
	| "ambiguous";

export type PublishOneFailInjection =
	| "none"
	| "pre_post"
	| "post_response_loss";

export type PublishOneState =
	| "published_verified"
	| "already_published"
	| "published_exists"
	| "draft_verified"
	| "draft_found"
	| "dry_run"
	| "ambiguous"
	| "failed"
	| "unknown";

export type PublishOneMethod =
	| "created"
	| "adopted_draft"
	| "already_published"
	| "failed"
	| "unknown"
	| "none";

export type PublishOneResult = {
	platform: "devto";
	postPath: string;
	canonicalUrl: string;
	state: PublishOneState;
	draftId?: number;
	id?: number;
	slug?: string;
	url?: string;
	observedPublished?: boolean;
	observedDraft?: boolean;
	method: PublishOneMethod;
	attempts: number;
	observedAt: string;
	runUrl?: string;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type SleepLike = (ms: number) => Promise<void>;

const DEVTO_API_ROOT = "https://dev.to/api";
const DEVTO_LIST_PAGE_SIZE = 1000;
const DEVTO_LIST_THROTTLE_MS = 350;
const DEVTO_VERIFY_ATTEMPTS = 6;
const DEVTO_VERIFY_SLEEP_MS = 10_000;
const DEVTO_TEMP_SLUG_PATTERN = /-temp-slug-/i;
const DEFAULT_DEVTO_USERNAME = "wintrover";
const DEFAULT_PUBLISH_RESULT_PATH = "publish-result.json";

function devtoSleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function asErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

export function normalizeCanonicalUrl(raw: string): string {
	const trimmed = String(raw || "").trim();
	if (!trimmed) return "";
	try {
		const candidate = /^https?:\/\//i.test(trimmed)
			? trimmed
			: `https://${trimmed.replace(/^\/+/, "")}`;
		const url = new URL(candidate);
		url.protocol = "https:";
		url.hostname = url.hostname.toLowerCase();
		url.search = "";
		url.hash = "";
		if (url.port === "80" || url.port === "443") url.port = "";
		const cleanPath = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
		url.pathname = cleanPath ? `/${cleanPath}/` : "/";
		return url.toString();
	} catch {
		return trimmed;
	}
}

function normalizeDevtoTitle(title: string) {
	return String(title || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

export function isDevtoPublished(article: DevtoArticle): boolean {
	if (
		typeof article.slug === "string" &&
		DEVTO_TEMP_SLUG_PATTERN.test(article.slug)
	) {
		return false;
	}
	if (article.published === true) return true;
	if (typeof article.published_at === "string" && article.published_at.trim()) {
		return Number.isFinite(Date.parse(article.published_at));
	}
	return false;
}

export function parseDevtoArticle(value: unknown): DevtoArticle | null {
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	if (typeof record.id !== "number" || !Number.isFinite(record.id)) return null;
	const article: DevtoArticle = { id: record.id };
	if (typeof record.title === "string") article.title = record.title;
	if (typeof record.description === "string") {
		article.description = record.description;
	}
	if (typeof record.published === "boolean")
		article.published = record.published;
	if (typeof record.published_at === "string") {
		article.published_at = record.published_at;
	}
	if (typeof record.canonical_url === "string") {
		article.canonical_url = record.canonical_url;
	}
	if (typeof record.url === "string") article.url = record.url;
	if (typeof record.slug === "string") article.slug = record.slug;
	if (typeof record.path === "string") article.path = record.path;
	return article;
}

export function selectExistingDevtoArticle(
	articles: DevtoArticle[],
	canonicalUrl: string,
	title?: string,
): DevtoArticleSelection {
	const targetCanonical = normalizeCanonicalUrl(canonicalUrl);
	const targetTitle = normalizeDevtoTitle(title || "");
	const canonicalMatches = targetCanonical
		? articles.filter(
				(article) =>
					normalizeCanonicalUrl(article.canonical_url || "") ===
					targetCanonical,
			)
		: [];
	const titleFallbackMatches =
		canonicalMatches.length === 0 && targetTitle.length > 0
			? articles.filter(
					(article) =>
						!normalizeCanonicalUrl(article.canonical_url || "") &&
						normalizeDevtoTitle(article.title || "") === targetTitle,
				)
			: [];
	const matches =
		canonicalMatches.length > 0 ? canonicalMatches : titleFallbackMatches;
	if (matches.length === 0) return { kind: "none" };
	if (matches.length === 1) return { kind: "one", article: matches[0] };
	return { kind: "ambiguous", articles: matches };
}

export function decideReconcileAction(
	selection: DevtoArticleSelection,
): DevtoReconcileAction {
	if (selection.kind === "none") return "create_draft";
	if (selection.kind === "one") {
		return selection.article.published === true
			? "already_published"
			: "adopt_draft";
	}
	return "ambiguous";
}

export function classifyDevtoError(
	status: number,
	errorText: string,
): "failed" | "unknown" {
	const text = String(errorText || "");
	if (!Number.isFinite(status) || status <= 0) return "unknown";
	if (status === 408 || status === 429) return "unknown";
	if (status >= 500) return "unknown";
	if (/timeout|timed out|abort|network|fetch failed|econn/i.test(text)) {
		return "unknown";
	}
	if (status >= 400 && status < 500) return "failed";
	return "unknown";
}

export function buildDevtoDraftPayload(
	post: PreparedPost,
	canonicalUrl: string,
) {
	return {
		article: {
			title: post.title,
			published: false,
			body_markdown: post.bodyMarkdown,
			tags: post.tags,
			description: post.description,
			canonical_url: normalizeCanonicalUrl(canonicalUrl),
			cover_image: post.firstImageUrl || undefined,
		},
	};
}

export function buildDevtoPublishPayload() {
	return { article: { published: true } };
}

export async function listAllDevtoArticles(
	apiKey: string,
	options: {
		fetchFn?: FetchLike;
		throttleMs?: number;
		sleepFn?: SleepLike;
	} = {},
): Promise<DevtoArticle[]> {
	const fetchFn = options.fetchFn || fetch;
	const sleepFn = options.sleepFn || devtoSleep;
	const throttleMs = options.throttleMs ?? DEVTO_LIST_THROTTLE_MS;
	const articles: DevtoArticle[] = [];
	let page = 1;
	for (;;) {
		if (page > 1) await sleepFn(throttleMs);
		let response: Response;
		try {
			response = await fetchFn(
				`${DEVTO_API_ROOT}/articles/me/all?per_page=${DEVTO_LIST_PAGE_SIZE}&page=${page}`,
				{
					headers: {
						"api-key": apiKey,
						Accept: "application/vnd.forem.api-v1+json",
					},
				},
			);
		} catch (error) {
			throw new Error(
				`DEV.to article list request failed on page ${page}: ${asErrorMessage(error)}`,
			);
		}
		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(
				`DEV.to article list request failed on page ${page} (${response.status}): ${errorText}`,
			);
		}
		let raw: unknown;
		try {
			raw = await response.json();
		} catch (error) {
			throw new Error(
				`DEV.to article list response was not valid JSON on page ${page}: ${asErrorMessage(error)}`,
			);
		}
		const entries = Array.isArray(raw) ? raw : [];
		for (const entry of entries) {
			const article = parseDevtoArticle(entry);
			if (article) articles.push(article);
		}
		if (entries.length === 0) break;
		page += 1;
	}
	return articles;
}

export async function fetchLatestDevtoArticles(
	options: { fetchFn?: FetchLike } = {},
): Promise<DevtoArticle[]> {
	const fetchFn = options.fetchFn || fetch;
	let response: Response;
	try {
		response = await fetchFn(
			`${DEVTO_API_ROOT}/articles/latest?per_page=${DEVTO_LIST_PAGE_SIZE}`,
			{ headers: { Accept: "application/vnd.forem.api-v1+json" } },
		);
	} catch (error) {
		throw new Error(
			`DEV.to latest articles request failed: ${asErrorMessage(error)}`,
		);
	}
	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`DEV.to latest articles request failed (${response.status}): ${errorText}`,
		);
	}
	let raw: unknown;
	try {
		raw = await response.json();
	} catch (error) {
		throw new Error(
			`DEV.to latest articles response was not valid JSON: ${asErrorMessage(error)}`,
		);
	}
	const entries = Array.isArray(raw) ? raw : [];
	const articles: DevtoArticle[] = [];
	for (const entry of entries) {
		const article = parseDevtoArticle(entry);
		if (article) articles.push(article);
	}
	return articles;
}

export type DevtoVerification = {
	verified: boolean;
	attempts: number;
	lastStatus: number;
	observedPublished: boolean | null;
	canonicalMatched: boolean | null;
	article: DevtoArticle | null;
	fallbackUsed: boolean;
	ambiguous: boolean;
};

type LatestFeedVerification = {
	verified: boolean;
	ambiguous: boolean;
	article: DevtoArticle | null;
};

const LATEST_FEED_UNVERIFIED: LatestFeedVerification = {
	verified: false,
	ambiguous: false,
	article: null,
};

async function verifyArticleViaLatestFeed(
	target: string,
	articleId: number | undefined,
	fetchFn: FetchLike,
): Promise<LatestFeedVerification> {
	if (!target && articleId === undefined) {
		return LATEST_FEED_UNVERIFIED;
	}
	let articles: DevtoArticle[];
	try {
		articles = await fetchLatestDevtoArticles({ fetchFn });
	} catch {
		return LATEST_FEED_UNVERIFIED;
	}
	const idMatches =
		articleId === undefined
			? []
			: articles.filter((article) => article.id === articleId);
	const canonicalMatches = target
		? articles.filter(
				(article) =>
					normalizeCanonicalUrl(article.canonical_url || "") === target,
			)
		: [];
	const candidates = canonicalMatches.length > 0 ? canonicalMatches : idMatches;
	if (candidates.length === 0) {
		return LATEST_FEED_UNVERIFIED;
	}
	if (candidates.length > 1) {
		return { verified: false, ambiguous: true, article: null };
	}
	const candidate = candidates[0];
	const canonicalMatched = target
		? normalizeCanonicalUrl(candidate.canonical_url || "") === target
		: null;
	if (canonicalMatched === false || !isDevtoPublished(candidate)) {
		return { verified: false, ambiguous: false, article: candidate };
	}
	return { verified: true, ambiguous: false, article: candidate };
}

export async function verifyPublishedArticle(
	slug: string,
	canonicalUrl: string,
	options: {
		username?: string;
		attempts?: number;
		sleepMs?: number;
		fetchFn?: FetchLike;
		sleepFn?: SleepLike;
		articleId?: number;
	} = {},
): Promise<DevtoVerification> {
	const fetchFn = options.fetchFn || fetch;
	const sleepFn = options.sleepFn || devtoSleep;
	const maxAttempts = options.attempts ?? DEVTO_VERIFY_ATTEMPTS;
	const sleepMs = options.sleepMs ?? DEVTO_VERIFY_SLEEP_MS;
	const username = options.username || DEFAULT_DEVTO_USERNAME;
	const target = normalizeCanonicalUrl(canonicalUrl);
	let lastStatus = 0;
	let lastObservedPublished: boolean | null = null;
	let lastCanonicalMatched: boolean | null = null;
	let lastArticle: DevtoArticle | null = null;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		await sleepFn(sleepMs);
		let response: Response;
		try {
			response = await fetchFn(
				`${DEVTO_API_ROOT}/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
				{ headers: { Accept: "application/vnd.forem.api-v1+json" } },
			);
		} catch {
			lastStatus = 0;
			continue;
		}
		lastStatus = response.status;
		if (!response.ok) continue;
		let raw: unknown;
		try {
			raw = await response.json();
		} catch {
			continue;
		}
		const article = parseDevtoArticle(raw);
		if (!article) continue;
		lastArticle = article;
		lastObservedPublished = isDevtoPublished(article);
		lastCanonicalMatched = target
			? normalizeCanonicalUrl(article.canonical_url || "") === target
			: null;
		if (lastObservedPublished && lastCanonicalMatched !== false) {
			return {
				verified: true,
				attempts: attempt,
				lastStatus,
				observedPublished: lastObservedPublished,
				canonicalMatched: lastCanonicalMatched,
				article,
				fallbackUsed: false,
				ambiguous: false,
			};
		}
	}
	const fallback = await verifyArticleViaLatestFeed(
		target,
		options.articleId,
		fetchFn,
	);
	if (fallback.verified && fallback.article) {
		return {
			verified: true,
			attempts: maxAttempts,
			lastStatus,
			observedPublished: true,
			canonicalMatched: target ? true : null,
			article: fallback.article,
			fallbackUsed: true,
			ambiguous: false,
		};
	}
	return {
		verified: false,
		attempts: maxAttempts,
		lastStatus,
		observedPublished: lastObservedPublished,
		canonicalMatched: lastCanonicalMatched,
		article: lastArticle,
		fallbackUsed: false,
		ambiguous: fallback.ambiguous,
	};
}

type DevtoWriteOutcome =
	| { kind: "ok"; body: unknown }
	| { kind: "http_error"; status: number; errorText: string }
	| { kind: "unresolved"; errorText: string };

async function writeDevtoArticle(
	url: string,
	method: "POST" | "PUT",
	apiKey: string,
	body: unknown,
	fetchFn: FetchLike,
): Promise<DevtoWriteOutcome> {
	let response: Response;
	try {
		response = await fetchFn(url, {
			method,
			headers: {
				"Content-Type": "application/json",
				Accept: "application/vnd.forem.api-v1+json",
				"api-key": apiKey,
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		return { kind: "unresolved", errorText: asErrorMessage(error) };
	}
	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		return { kind: "http_error", status: response.status, errorText };
	}
	try {
		return { kind: "ok", body: await response.json() };
	} catch (error) {
		return { kind: "unresolved", errorText: asErrorMessage(error) };
	}
}

export function buildGithubRunUrl(
	env: NodeJS.ProcessEnv = process.env,
): string | undefined {
	const server = env.GITHUB_SERVER_URL;
	const repository = env.GITHUB_REPOSITORY;
	const runId = env.GITHUB_RUN_ID;
	if (!server || !repository || !runId) return undefined;
	return `${server}/${repository}/actions/runs/${runId}`;
}

export function publishOneExitCode(result: PublishOneResult): number {
	if (
		result.state === "published_verified" ||
		result.state === "already_published" ||
		result.state === "draft_verified" ||
		result.state === "dry_run"
	) {
		return 0;
	}
	return 1;
}

export function buildPublishOneSummary(result: PublishOneResult): string {
	const lines = [
		"## Publish One Result",
		"",
		`- state: \`${result.state}\``,
		`- method: \`${result.method}\``,
		`- post: ${result.postPath}`,
		`- canonical: ${result.canonicalUrl || "n/a"}`,
		`- url: ${result.url || "n/a"}`,
		`- attempts: ${result.attempts}`,
		`- observed draft: ${result.observedDraft ?? false}`,
		`- observed at: ${result.observedAt}`,
	];
	if (result.runUrl) lines.push(`- run: ${result.runUrl}`);
	return `${lines.join("\n")}\n`;
}

async function writePublishOneOutputs(
	resultPath: string,
	result: PublishOneResult,
) {
	await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (summaryPath) {
		await fs.appendFile(summaryPath, buildPublishOneSummary(result));
	}
}

export type PublishOneOptions = {
	postPath: string;
	platform: "devto";
	dryRun: boolean;
	draftOnly?: boolean;
	failInjection: PublishOneFailInjection;
	apiKey?: string;
	publicBaseUrl?: string;
	resultPath?: string;
	username?: string;
	fetchFn?: FetchLike;
	sleepFn?: SleepLike;
	nowFn?: () => Date;
};

export async function runPublishOne(
	options: PublishOneOptions,
): Promise<PublishOneResult> {
	const fetchFn = options.fetchFn || fetch;
	const sleepFn = options.sleepFn || devtoSleep;
	const nowFn = options.nowFn || (() => new Date());
	const draftOnly = options.draftOnly ?? true;
	const publicBaseUrl = normalizePublicBaseUrl(
		options.publicBaseUrl ||
			process.env.BLOG_PUBLIC_BASE_URL ||
			DEFAULT_PUBLIC_BASE_URL,
	);
	const resultPath =
		options.resultPath ||
		process.env.PUBLISH_RESULT_PATH ||
		DEFAULT_PUBLISH_RESULT_PATH;
	const result: PublishOneResult = {
		platform: "devto",
		postPath: options.postPath,
		canonicalUrl: "",
		state: "unknown",
		method: "unknown",
		attempts: 0,
		observedAt: nowFn().toISOString(),
		runUrl: buildGithubRunUrl(),
	};
	const finalize = async () => {
		result.observedAt = nowFn().toISOString();
		await writePublishOneOutputs(resultPath, result);
		process.stdout.write(
			`[publish-one] state=${result.state} method=${result.method} attempts=${result.attempts} result=${resultPath}\n`,
		);
		return result;
	};
	const failWith = async (
		state: PublishOneState,
		method: PublishOneMethod,
		detail: Record<string, unknown> = {},
	) => {
		result.state = state;
		result.method = method;
		logError("post-to-dev", `publish-one ended in state=${state}`, {
			postPath: options.postPath,
			canonicalUrl: result.canonicalUrl,
			...detail,
		});
		return finalize();
	};

	let prepared: PreparedPost;
	try {
		prepared = await preparePost(options.postPath, publicBaseUrl);
	} catch (error) {
		logError("post-to-dev", "publish-one could not prepare the post", {
			error,
		});
		return failWith("failed", "failed");
	}
	result.canonicalUrl = normalizeCanonicalUrl(prepared.canonicalUrl);
	const apiKey = options.apiKey || process.env.DEVTO_API_KEY || "";
	if (!apiKey) {
		return failWith("failed", "failed", { detail: "DEVTO_API_KEY is not set" });
	}

	let articles: DevtoArticle[];
	try {
		articles = await listAllDevtoArticles(apiKey, { fetchFn, sleepFn });
	} catch (error) {
		logError("post-to-dev", "publish-one could not list existing articles", {
			error,
		});
		return failWith("unknown", "unknown");
	}
	process.stdout.write(
		`[publish-one] listed ${articles.length} existing article(s)\n`,
	);
	if (options.failInjection === "pre_post") {
		return failWith("failed", "failed", {
			detail: "injected failure before any write (pre_post)",
		});
	}

	const selection = selectExistingDevtoArticle(
		articles,
		result.canonicalUrl,
		prepared.title,
	);
	const action = decideReconcileAction(selection);
	if (action === "ambiguous") {
		return failWith("ambiguous", "failed", {
			ids:
				selection.kind === "ambiguous"
					? selection.articles.map((article) => article.id)
					: [],
		});
	}
	if (action === "already_published" && selection.kind === "one") {
		result.state = draftOnly ? "published_exists" : "already_published";
		result.method = "already_published";
		result.id = selection.article.id;
		result.slug = selection.article.slug || prepared.slug;
		result.url = selection.article.url;
		result.observedPublished = true;
		if (draftOnly) {
			logError(
				"post-to-dev",
				"publish-one found an already published article; draft-only requires unpublish-one first",
				{ id: selection.article.id, slug: selection.article.slug },
			);
		}
		return finalize();
	}
	if (options.dryRun) {
		result.state = "dry_run";
		result.method = "none";
		return finalize();
	}

	let articleId: number;
	if (action === "adopt_draft" && selection.kind === "one") {
		articleId = selection.article.id;
		result.draftId = articleId;
		result.slug = selection.article.slug || prepared.slug;
		result.url = selection.article.url;
		result.method = "adopted_draft";
		result.state = "draft_found";
		process.stdout.write(
			`[publish-one] adopting existing draft id=${articleId}\n`,
		);
	} else {
		if (options.failInjection === "post_response_loss") {
			const injectedOutcome = await fetchFn(`${DEVTO_API_ROOT}/articles`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/vnd.forem.api-v1+json",
					"api-key": apiKey,
				},
				body: JSON.stringify(
					buildDevtoDraftPayload(prepared, result.canonicalUrl),
				),
			}).then(
				() => "responded" as const,
				() => "rejected" as const,
			);
			result.attempts += 1;
			logError(
				"post-to-dev",
				"publish-one discarded the draft create response (injected failure)",
				{
					postPath: options.postPath,
					outcome: injectedOutcome,
				},
			);
			return failWith("unknown", "unknown", {
				detail: "draft create response lost (injected timeout-like failure)",
			});
		}
		const created = await writeDevtoArticle(
			`${DEVTO_API_ROOT}/articles`,
			"POST",
			apiKey,
			buildDevtoDraftPayload(prepared, result.canonicalUrl),
			fetchFn,
		);
		result.attempts += 1;
		if (created.kind === "http_error") {
			const classification = classifyDevtoError(
				created.status,
				created.errorText,
			);
			return classification === "failed"
				? failWith("failed", "failed", {
						stage: "draft_create",
						status: created.status,
						classification,
					})
				: failWith("unknown", "unknown", {
						stage: "draft_create",
						status: created.status,
						classification,
					});
		}
		if (created.kind === "unresolved") {
			return failWith("unknown", "unknown", {
				stage: "draft_create",
				errorText: created.errorText,
			});
		}
		const draftArticle = parseDevtoArticle(created.body);
		if (!draftArticle) {
			return failWith("unknown", "unknown", {
				stage: "draft_create",
				detail: "draft response missing article id",
			});
		}
		articleId = draftArticle.id;
		result.draftId = articleId;
		result.slug = draftArticle.slug || prepared.slug;
		result.method = "created";
		result.state = "draft_found";
		process.stdout.write(`[publish-one] created draft id=${articleId}\n`);
	}

	if (draftOnly) {
		let verifiedDraft: DevtoArticle | null = null;
		try {
			const latestArticles = await listAllDevtoArticles(apiKey, {
				fetchFn,
				sleepFn,
			});
			verifiedDraft =
				latestArticles.find((article) => article.id === articleId) ?? null;
		} catch (error) {
			return failWith("unknown", "unknown", {
				stage: "draft_verify",
				error: asErrorMessage(error),
			});
		}
		if (!verifiedDraft) {
			return failWith("unknown", "unknown", {
				stage: "draft_verify",
				detail: "draft not found after create/adopt",
				draftId: articleId,
			});
		}
		if (verifiedDraft.published !== false) {
			return failWith("published_exists", "already_published", {
				stage: "draft_verify",
				draftId: articleId,
			});
		}
		const canonicalMatched =
			normalizeCanonicalUrl(verifiedDraft.canonical_url || "") ===
			result.canonicalUrl;
		if (!canonicalMatched) {
			return failWith("unknown", "unknown", {
				stage: "draft_verify",
				detail: "canonical mismatch",
				draftId: articleId,
			});
		}
		result.id = articleId;
		result.slug = verifiedDraft.slug || result.slug;
		result.url = verifiedDraft.url;
		result.state = "draft_verified";
		result.observedDraft = true;
		result.observedPublished = false;
		return finalize();
	}

	const published = await writeDevtoArticle(
		`${DEVTO_API_ROOT}/articles/${articleId}`,
		"PUT",
		apiKey,
		buildDevtoPublishPayload(),
		fetchFn,
	);
	result.attempts += 1;
	if (published.kind === "http_error") {
		const classification = classifyDevtoError(
			published.status,
			published.errorText,
		);
		return classification === "failed"
			? failWith("failed", "failed", {
					stage: "draft_publish",
					status: published.status,
					classification,
					draftId: articleId,
				})
			: failWith("unknown", "unknown", {
					stage: "draft_publish",
					status: published.status,
					classification,
					draftId: articleId,
				});
	}
	if (published.kind === "unresolved") {
		return failWith("unknown", "unknown", {
			stage: "draft_publish",
			draftId: articleId,
			errorText: published.errorText,
		});
	}
	const publishedArticle = parseDevtoArticle(published.body);
	result.id = publishedArticle?.id ?? articleId;
	if (publishedArticle?.slug) result.slug = publishedArticle.slug;
	if (publishedArticle?.url) result.url = publishedArticle.url;

	const verification = await verifyPublishedArticle(
		result.slug || prepared.slug,
		result.canonicalUrl,
		{
			username: options.username || process.env.DEVTO_USERNAME,
			fetchFn,
			sleepFn,
			articleId: result.id,
		},
	);
	if (verification.verified && verification.article) {
		result.state = "published_verified";
		result.observedPublished = true;
		if (verification.article.url) result.url = verification.article.url;
		if (verification.article.slug) result.slug = verification.article.slug;
		if (verification.fallbackUsed) {
			process.stdout.write(
				`[publish-one] verified via latest feed fallback id=${verification.article.id}\n`,
			);
		}
	} else {
		result.state = "unknown";
		result.observedPublished = verification.observedPublished ?? undefined;
		logError(
			"post-to-dev",
			"publish-one could not verify the published article",
			{
				slug: result.slug,
				attempts: verification.attempts,
				lastStatus: verification.lastStatus,
			},
		);
	}
	return finalize();
}

export type ParsedPublishOneArgs = {
	postPath: string;
	platform: "devto";
	dryRun: boolean;
	failInjection: PublishOneFailInjection;
};

export function parsePublishOneArgs(args: string[]): ParsedPublishOneArgs {
	let postPath = "";
	let platform = "";
	let dryRun = false;
	let failInjection: PublishOneFailInjection = "none";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--publish-one") {
			i += 1;
			postPath = (args[i] || "").trim();
			continue;
		}
		if (arg === "--platform") {
			i += 1;
			platform = (args[i] || "").trim().toLowerCase();
			continue;
		}
		if (arg === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (arg === "--fail-injection") {
			i += 1;
			const value = (args[i] || "").trim();
			if (
				value !== "none" &&
				value !== "pre_post" &&
				value !== "post_response_loss"
			) {
				throw new Error(`Invalid --fail-injection value: ${value}`);
			}
			failInjection = value;
			continue;
		}
		throw new Error(`Unknown publish-one argument: ${arg}`);
	}
	if (!postPath) {
		throw new Error("--publish-one requires a post markdown path");
	}
	if (platform !== "devto") {
		throw new Error(
			`--platform must be devto (got: ${platform || "(missing)"})`,
		);
	}
	return { postPath, platform: "devto", dryRun, failInjection };
}

async function executePublishOneCli(argv: string[]) {
	try {
		const parsed = parsePublishOneArgs(argv);
		const result = await runPublishOne({
			postPath: parsed.postPath,
			platform: parsed.platform,
			dryRun: parsed.dryRun,
			failInjection: parsed.failInjection,
		});
		if (publishOneExitCode(result) !== 0) {
			process.exitCode = 1;
		}
	} catch (error) {
		logError("post-to-dev", "publish-one invocation error", { error });
		process.exitCode = 1;
	}
}

if (process.argv[1] && path.basename(process.argv[1]) === "post-to-dev.ts") {
	dotenv.config({ path: ".env.local" });
	if (process.argv.slice(2).includes("--publish-one")) {
		executePublishOneCli(process.argv.slice(2));
	} else {
		const targetInput = process.argv[2];
		const platformsArg = process.argv[3];
		runDeployment(targetInput, platformsArg).catch((error) => {
			logError("post-to-dev", "An error occurred", { error });
			process.exit(1);
		});
	}
}
