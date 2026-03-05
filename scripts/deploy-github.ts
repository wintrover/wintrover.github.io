import fs from "node:fs";
import path from "node:path";

console.log("🚀 Verifying GitHub Pages build output...");

const distPath = path.join(process.cwd(), "dist");
const indexPath = path.join(distPath, "index.html");

if (!fs.existsSync(distPath)) {
	console.error("❌ Build output not found: dist directory does not exist");
	console.log("Please run: npm run build:github");
	process.exit(1);
}

if (!fs.existsSync(indexPath)) {
	console.error("❌ Build output invalid: index.html not found in dist");
	process.exit(1);
}

console.log("✅ Build verification successful");
console.log("📦 Ready for GitHub Pages deployment!");
