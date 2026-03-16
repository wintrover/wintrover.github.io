import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";
import puppeteer, { type Browser, type ScreenshotOptions } from "puppeteer";
import { logError } from "../src/lib/log";

const execAsync = promisify(exec);

async function resolvePublicImageUrl(
	publicBaseUrl: string,
	outputDir: string,
	filename: string,
) {
	try {
		const mode = String(process.env.BLOG_IMAGE_ABS_MODE || "").toLowerCase();
		if (mode === "raw") {
			const { stdout: remoteUrl } = await execAsync(
				"git remote get-url origin",
			);
			const match = remoteUrl.match(
				/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?/i,
			);
			if (match) {
				const owner = match[1];
				const repo = match[2];
				const rawPath = `${outputDir}/${filename}`.replace(/\\/g, "/");
				return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${rawPath}`;
			}
		}
		let urlPath = outputDir.replace(/\\/g, "/");
		if (urlPath.startsWith("public/")) {
			urlPath = urlPath.substring(7);
		}
		return `${publicBaseUrl.replace(/\/$/, "")}/${urlPath}/${filename}`;
	} catch (error: unknown) {
		logError("image-tools", "GitHub repo info 가져오기 실패", { error });
		let urlPath = outputDir.replace(/\\/g, "/");
		if (urlPath.startsWith("public/")) {
			urlPath = urlPath.substring(7);
		}
		return `${publicBaseUrl.replace(/\/$/, "")}/${urlPath}/${filename}`;
	}
}

export async function convertMermaidToImage(
	mermaidCode: string,
	outputPath: string,
) {
	let browser: Browser | undefined;
	try {
		browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		const page = await browser.newPage();
		const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.9.0/dist/mermaid.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; background: white; font-family: Arial, sans-serif; }
        .mermaid { display: flex; justify-content: center; align-items: center; }
    </style>
</head>
<body>
    <div class="mermaid">
${mermaidCode}
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default', themeVariables: { primaryColor: '#ffffff', primaryTextColor: '#333333', primaryBorderColor: '#cccccc', lineColor: '#333333', secondaryColor: '#f8f9fa', tertiaryColor: '#e9ecef' }, flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }, sequence: { useMaxWidth: true, diagramMarginX: 50, diagramMarginY: 10, actorMargin: 50, width: 150, height: 65, boxMargin: 10, boxTextMargin: 5, noteMargin: 10, messageMargin: 35, mirrorActors: true, bottomMarginAdj: 1, wrap: true } });
    </script>
</body>
</html>`;
		await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });
		await new Promise((resolve) => setTimeout(resolve, 3000));
		const mermaidElement = await page.$(".mermaid");
		if (!mermaidElement) throw new Error("Mermaid diagram not found");
		await mermaidElement.screenshot({
			path: outputPath,
			type: "png",
			omitBackground: false,
		} as ScreenshotOptions);
		return outputPath;
	} catch (error) {
		logError("image-tools", "Mermaid 이미징 변환 실패", { error });
		throw error;
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

export async function convertSvgToPng(svgFilePath: string, outputPath: string) {
	let browser: Browser | undefined;
	try {
		const svgContent = await fs.readFile(svgFilePath, "utf-8");
		browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		const page = await browser.newPage();
		await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 2 });
		const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: white; }
        svg { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>`;
		await page.setContent(htmlTemplate);
		await page.screenshot({
			path: outputPath,
			type: "png",
			fullPage: false,
			clip: { x: 0, y: 0, width: 1000, height: 560 },
		});
		console.log(`✅ Converted SVG to PNG: ${outputPath}`);
		return outputPath;
	} catch (error) {
		logError("image-tools", "Error converting SVG to PNG", {
			svgFilePath,
			outputPath,
			error,
		});
		throw error;
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

export function extractMermaidBlocks(markdown: string) {
	const mermaidBlocks: {
		code: string;
		startIndex: number;
		endIndex: number;
	}[] = [];
	const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
	let match: RegExpExecArray | null;
	while ((match = mermaidRegex.exec(markdown)) !== null) {
		mermaidBlocks.push({
			code: match[1].trim(),
			startIndex: match.index,
			endIndex: match.index + match[0].length,
		});
	}
	return mermaidBlocks;
}

export async function processMermaidDiagrams(
	markdown: string,
	publicBaseUrl: string,
	outputDir = "public/images",
	filenameBase = "diagram",
) {
	const mermaidBlocks = extractMermaidBlocks(markdown);
	if (mermaidBlocks.length === 0) {
		return {
			content: markdown,
			images: [] as { path: string; url: string; filename: string }[],
		};
	}
	await fs.mkdir(outputDir, { recursive: true });
	let processedContent = markdown;
	const images: { path: string; url: string; filename: string }[] = [];
	for (let i = mermaidBlocks.length - 1; i >= 0; i--) {
		const block = mermaidBlocks[i];
		try {
			const idx = mermaidBlocks.length - i;
			const filename = `${filenameBase}-${idx}.png`;
			const imagePath = path.join(outputDir, filename);
			const imageUrl = await resolvePublicImageUrl(
				publicBaseUrl,
				outputDir,
				filename,
			);
			await convertMermaidToImage(block.code, imagePath);
			const imageMarkdown = `![Mermaid Diagram](${imageUrl})`;
			processedContent =
				processedContent.substring(0, block.startIndex) +
				imageMarkdown +
				processedContent.substring(block.endIndex);
			images.push({ path: imagePath, url: imageUrl, filename });
			console.log(`✅ Converted Mermaid diagram to image: ${filename}`);
		} catch (error) {
			logError("image-tools", "Mermaid 다이어그램 변환 실패", {
				filenameBase,
				error,
			});
			const fallbackMarkdown = `> ⚠️ **Mermaid Diagram Could Not Be Rendered**\n\n\`\`\`mermaid\n${block.code}\n\`\`\``;
			processedContent =
				processedContent.substring(0, block.startIndex) +
				fallbackMarkdown +
				processedContent.substring(block.endIndex);
		}
	}
	return { content: processedContent, images };
}

function splitFrontMatter(raw: string) {
	const lines = raw.split(/\r?\n/);
	if (lines[0] !== "---") {
		return { frontMatterBlock: null as string | null, body: raw };
	}
	const endIndexAfterFirstLine = lines
		.slice(1)
		.findIndex((line) => line.trim() === "---");
	if (endIndexAfterFirstLine === -1) {
		return { frontMatterBlock: null as string | null, body: raw };
	}
	const endIndex = endIndexAfterFirstLine + 1;
	const frontMatterBlock = lines.slice(0, endIndex + 1).join("\n");
	const body = lines
		.slice(endIndex + 1)
		.join("\n")
		.replace(/^\n+/, "");
	return { frontMatterBlock, body };
}

async function listMarkdownFiles(dir: string) {
	const out: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const e of entries) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			const sub = await listMarkdownFiles(p);
			out.push(...sub);
		} else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
			out.push(p);
		}
	}
	return out;
}

function deriveFilenameBase(
	filePath: string,
	frontmatter: Record<string, unknown>,
) {
	const base = path.basename(filePath, path.extname(filePath));
	const m = base.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d+))?$/);
	const datePart = m?.[1] || String(frontmatter?.date || "");
	const numPart = m?.[2] || "0";
	const prefix = datePart || "unknown";
	return `${prefix}-${numPart}`;
}

export async function generateMermaidImagesForPosts(
	postsRoot = "src/posts",
	outputDir = "public/images",
) {
	const files = await listMarkdownFiles(postsRoot);
	for (const filePath of files) {
		const raw = await fs.readFile(filePath, "utf-8");
		const { data, content } = matter(raw);
		const filenameBase = deriveFilenameBase(filePath, data);
		const { content: processedContent } = await processMermaidDiagrams(
			content,
			"/",
			outputDir,
			filenameBase,
		);
		if (processedContent !== content) {
			const { frontMatterBlock } = splitFrontMatter(raw);
			const out = frontMatterBlock
				? `${frontMatterBlock}\n\n${processedContent.trim()}\n`
				: processedContent;
			await fs.writeFile(filePath, out, "utf-8");
		}
	}
}

export type MermaidDiagramTask = {
	code: string;
	outputFilename: string;
	successMessage: string;
};

export async function renderMermaidDiagramTasks(
	tasks: MermaidDiagramTask[],
	outputDir = "public/images",
) {
	for (const task of tasks) {
		await convertMermaidToImage(
			task.code,
			path.join(outputDir, task.outputFilename),
		);
		console.log(task.successMessage);
	}
}

export async function runGenerateImagesCi(
	postsRoot = "src/posts",
	outputDir = "public/images",
) {
	try {
		await generateMermaidImagesForPosts(postsRoot, outputDir);
		console.log("OK: mermaid images generated");
	} catch (error) {
		logError("generate-images-ci", "mermaid 이미지 생성 실패", { error });
		process.exit(1);
	}
}

export async function runSvgToPngCli(svgPath?: string, pngPath?: string) {
	if (!svgPath || !pngPath) {
		logError(
			"svg-to-png",
			"Usage: tsx scripts/image-tools.ts svg-to-png <input-svg> <output-png>",
			{
				error: new Error("Missing arguments"),
			},
		);
		process.exit(1);
	}
	try {
		await convertSvgToPng(svgPath, pngPath);
	} catch (error) {
		logError("svg-to-png", "Unhandled error", { error });
		process.exit(1);
	}
}

if (process.argv[1] && path.basename(process.argv[1]) === "image-tools.ts") {
	const command = process.argv[2];
	if (command === "generate-images-ci") {
		runGenerateImagesCi(process.argv[3], process.argv[4]);
	} else if (command === "svg-to-png") {
		runSvgToPngCli(process.argv[3], process.argv[4]);
	}
}
