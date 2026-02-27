import fs from "node:fs";
import path from "node:path";

console.log("🚀 Starting GitHub Pages build process...");

const distPath = path.join(process.cwd(), "dist");
const notFoundPath = path.join(distPath, "404.html");

if (fs.existsSync(distPath)) {
	fs.copyFileSync(path.join(process.cwd(), "404.html"), notFoundPath);
	console.log("✅ 404.html copied to dist directory");
	const indexPath = path.join(distPath, "index.html");
	if (fs.existsSync(indexPath)) {
		console.log("✅ Build verification successful");
		console.log("📦 Ready for GitHub Pages deployment!");
		console.log("");
		console.log("Next steps:");
		console.log("1. Commit and push the dist folder to your gh-pages branch");
		console.log("2. Or use GitHub Actions to automatically deploy");
		console.log("3. Visit https://wintrover.github.io/blog/");
	} else {
		console.error("❌ Build failed: index.html not found in dist");
		process.exit(1);
	}
} else {
	console.error("❌ Build failed: dist directory not found");
	console.log("Please run: npm run build:github");
	process.exit(1);
}
