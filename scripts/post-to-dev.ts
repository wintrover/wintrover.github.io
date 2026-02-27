import "dotenv/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { processMermaidDiagrams } from "./mermaid-to-image";

function normalizePublicBaseUrl(url: string) {
	try {
		if (typeof url !== "string" || !url)
			return "https://wintrover.github.io/blog";
		const trimmed = url.trim().replace(/["']/g, "");
		const u = new URL(
			trimmed.startsWith("http")
				? trimmed
				: `https://${trimmed.replace(/^\/*/, "")}`,
		);
		if (!u.pathname.endsWith("/blog")) {
			if (u.pathname === "/") {
				u.pathname = "/blog/";
			} else if (!u.pathname.includes("/blog")) {
				u.pathname = `${u.pathname.replace(/\/$/, "")}/blog/`;
			}
		}
		if (!u.pathname.endsWith("/")) {
			u.pathname = `${u.pathname}/`;
		}
		return u.toString();
	} catch {
		return "https://wintrover.github.io/blog";
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

export function absolutizeSrc(src: string, publicBaseUrl: string) {
	try {
		if (typeof src !== "string" || !src) return src as any;
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
		const underBlog = base.pathname.replace(/\/+$/, "").endsWith("/blog");
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
		let p;
		if (underBlog) {
			p = assetPath.replace(/^\/+/, "");
		} else {
			p = `/blog/${assetPath.replace(/^\/+/, "")}`;
		}
		const abs = new URL(p, base).toString();
		return abs;
	} catch {
		return src as any;
	}
}

export async function absolutizeImagesInMarkdown(
	markdown: string,
	publicBaseUrl: string,
	firstImageRef: { url: string | null },
) {
	if (typeof markdown !== "string") return markdown as any;
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

async function postToDev(filePath: string) {
	const devtoApiKey = process.env.DEVTO_API_KEY;
	const publicBaseUrlRaw =
		process.env.BLOG_PUBLIC_BASE_URL || "https://wintrover.github.io/blog";
	const publicBaseUrl = normalizePublicBaseUrl(publicBaseUrlRaw);
	if (!devtoApiKey) {
		console.error("DEVTO_API_KEY is not set.");
		process.exit(1);
	}
	try {
		const markdownWithMeta = await fs.readFile(filePath, "utf-8");
		const { data: frontmatter, content } = matter(markdownWithMeta);
		const rawTags = (frontmatter as any).tags;
		const normalizedTags = Array.isArray(rawTags)
			? rawTags
			: typeof rawTags === "string"
				? rawTags.split(/[,\s]+/).filter(Boolean)
				: [];
		const sanitized = Array.from(
			new Set(
				normalizedTags
					.map((t: any) =>
						String(t)
							.toLowerCase()
							.replace(/[^a-z0-9]/g, ""),
					)
					.filter(Boolean),
			),
		);
		const tags = sanitized.slice(0, 4);
		console.log("🔄 Processing Mermaid diagrams...");
		const mermaidOutputDir = path.join("public", "images");
		const baseName = path.basename(filePath, path.extname(filePath));
		const m = baseName.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d+))?/);
		const datePart = m?.[1] || ((frontmatter as any).date || "").toString();
		const numPart = m?.[2] || "0";
		const filenameBase = `${datePart}-${numPart}`;
		const { content: processedContent, images: mermaidImages } =
			await processMermaidDiagrams(
				content,
				publicBaseUrl,
				mermaidOutputDir,
				filenameBase,
			);
		if (mermaidImages.length > 0) {
			console.log(
				`✅ Successfully converted ${mermaidImages.length} Mermaid diagram(s) to images`,
			);
			mermaidImages.forEach((img) => {
				console.log(`   📊 ${img.filename} -> ${img.url}`);
			});
		} else {
			console.log("ℹ️  No Mermaid diagrams found in content");
		}
		const firstImageRef = { url: null as string | null };
		const bodyMarkdown = await absolutizeImagesInMarkdown(
			processedContent,
			publicBaseUrl,
			firstImageRef,
		);
		const slug = slugifyTitle(
			(frontmatter as any).title ||
				path.basename(filePath, path.extname(filePath)),
		);
		const canonicalUrl =
			(frontmatter as any).canonical_url || `${publicBaseUrl}#/post/${slug}`;
		const clampTitle = (t: string) => {
			if (!t) return "";
			return t.length <= 128 ? t : `${t.slice(0, 125)}...`;
		};
		const article = {
			title: clampTitle((frontmatter as any).title),
			published: false,
			body_markdown: bodyMarkdown,
			tags,
			description:
				(frontmatter as any).excerpt ||
				(frontmatter as any).description ||
				undefined,
			canonical_url: canonicalUrl,
			cover_image:
				(frontmatter as any).cover_image || firstImageRef.url || undefined,
		};

		// Check if article exists
		console.log(`🔍 Checking if article "${article.title}" already exists...`);
		const checkResponse = await fetch(
			"https://dev.to/api/articles/me/all?per_page=1000",
			{
				headers: { "api-key": devtoApiKey },
			},
		);

		let existingId = null;
		if (checkResponse.ok) {
			const articles = (await checkResponse.json()) as any[];
			const found = articles.find((a) => a.title === article.title);
			if (found) {
				existingId = found.id;
				console.log(`✅ Found existing article ID: ${existingId}`);
			}
		}

		let response;
		if (existingId) {
			console.log(`🔄 Updating existing article ${existingId}...`);
			response = await fetch(`https://dev.to/api/articles/${existingId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/vnd.forem.api-v1+json",
					"api-key": devtoApiKey,
				},
				body: JSON.stringify({ article }),
			});
		} else {
			console.log("✨ Creating new draft...");
			response = await fetch("https://dev.to/api/articles", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/vnd.forem.api-v1+json",
					"api-key": devtoApiKey,
				},
				body: JSON.stringify({ article }),
			});
		}

		if (response.ok) {
			const result = (await response.json()) as any;
			console.log(
				`Successfully ${existingId ? "updated" : "created"} draft: ${result.url}`,
			);
		} else {
			const error = (await response.json()) as any;
			console.error("Failed to create draft:", error);
			process.exit(1);
		}
	} catch (error) {
		console.error("An error occurred:", error);
		process.exit(1);
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
	} catch (error: any) {
		console.error("Failed to process UCloud image:", error.message);
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
	const postFilePath = process.argv[2];
	if (!postFilePath) {
		console.error("Please provide a path to a markdown file.");
		process.exit(1);
	}
	postToDev(path.resolve(postFilePath));
}
