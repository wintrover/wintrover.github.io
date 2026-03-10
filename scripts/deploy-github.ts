import fs from "node:fs";
import path from "node:path";
import { logError } from "../src/lib/log";

console.log("🚀 Verifying GitHub Pages build output...");

const distPath = path.join(process.cwd(), "dist");
const indexPath = path.join(distPath, "index.html");

if (!fs.existsSync(distPath)) {
	logError(
		"deploy-github",
		"Build output not found: dist directory does not exist",
		{
			error: new Error("dist directory does not exist"),
		},
	);
	console.log("Please run: npm run build:github");
	process.exit(1);
}

if (!fs.existsSync(indexPath)) {
	logError(
		"deploy-github",
		"Build output invalid: index.html not found in dist",
		{
			error: new Error("index.html not found in dist"),
		},
	);
	process.exit(1);
}

console.log("✅ Build verification successful");
console.log("📦 Ready for GitHub Pages deployment!");
