import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";

async function getGitHubRawUrl(outputDir: string, filename: string) {
	try {
		const { exec } = await import("node:child_process");
		const util = await import("node:util");
		const execAsync = util.promisify(exec);
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
		const publicBaseUrl = "https://wintrover.github.io/blog";
		let urlPath = outputDir.replace(/\\/g, "/");
		if (urlPath.startsWith("public/")) {
			urlPath = urlPath.substring(7);
		}
		return `${publicBaseUrl}/${urlPath}/${filename}`;
	} catch (error: any) {
		console.error("Failed to get GitHub repo info:", error.message);
		const publicBaseUrl = "https://wintrover.github.io/blog";
		let urlPath = outputDir.replace(/\\/g, "/");
		if (urlPath.startsWith("public/")) {
			urlPath = urlPath.substring(7);
		}
		return `${publicBaseUrl}/${urlPath}/${filename}`;
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
		} as any);
		return outputPath;
	} catch (error) {
		console.error("Error converting Mermaid to image:", error);
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
	_publicBaseUrl: string,
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
			const imageUrl = await getGitHubRawUrl(outputDir, filename);
			await convertMermaidToImage(block.code, imagePath);
			const imageMarkdown = `![Mermaid Diagram](${imageUrl})`;
			processedContent =
				processedContent.substring(0, block.startIndex) +
				imageMarkdown +
				processedContent.substring(block.endIndex);
			images.push({ path: imagePath, url: imageUrl, filename });
			console.log(`✅ Converted Mermaid diagram to image: ${filename}`);
		} catch (error) {
			console.error(`❌ Failed to convert Mermaid diagram:`, error);
			const fallbackMarkdown = `> ⚠️ **Mermaid Diagram Could Not Be Rendered**\n\n\`\`\`mermaid\n${block.code}\n\`\`\``;
			processedContent =
				processedContent.substring(0, block.startIndex) +
				fallbackMarkdown +
				processedContent.substring(block.endIndex);
		}
	}
	return { content: processedContent, images };
}
