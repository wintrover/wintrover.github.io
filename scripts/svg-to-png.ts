import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { logError } from "../src/lib/log";

export async function convertSvgToPng(svgFilePath: string, outputPath: string) {
	let browser: puppeteer.Browser | undefined;
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
		logError("svg-to-png", "Error converting SVG to PNG", {
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

if (process.argv[1] && path.basename(process.argv[1]) === "svg-to-png.ts") {
	const svgPath = process.argv[2];
	const pngPath = process.argv[3];
	if (!svgPath || !pngPath) {
		logError(
			"svg-to-png",
			"Usage: tsx svg-to-png.ts <input-svg> <output-png>",
			{
				error: new Error("Missing arguments"),
			},
		);
		process.exit(1);
	}
	convertSvgToPng(svgPath, pngPath)
		.then(() => process.exit(0))
		.catch((error) => {
			logError("svg-to-png", "Unhandled error", { error });
			process.exit(1);
		});
}
