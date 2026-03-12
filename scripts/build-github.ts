import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Env = Record<string, string | undefined>;

function run(cmd: string, args: string[], env: Env = {}) {
	execFileSync(cmd, args, {
		stdio: "inherit",
		env: { ...process.env, ...env },
		shell: process.platform === "win32",
	});
}

function rm(target: string) {
	fs.rmSync(target, { recursive: true, force: true });
}

function mk(target: string) {
	fs.mkdirSync(target, { recursive: true });
}

function writeFile(target: string, content: string) {
	mk(path.dirname(target));
	fs.writeFileSync(target, content);
}

function buildBlog(dist: string, locale: "ko" | "en") {
	const basePath = `/${locale}/`;
	run("npm", ["run", "build"], {
		VITE_BASE_PATH: basePath,
		VITE_OUT_DIR: path.join(dist, locale),
		VITE_LOCALE: locale,
		VITE_HTML_LANG: locale,
	});
}

function main() {
	const root = process.cwd();
	const dist = path.join(root, "dist");

	rm(dist);
	mk(dist);

	const publicDir = path.join(root, "public");
	if (fs.existsSync(publicDir)) {
		fs.cpSync(publicDir, dist, { recursive: true });
	}

	const selectorHtml =
		'<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>wintrover</title><meta name="robots" content="index,follow"/><link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/"/><link rel="alternate" hreflang="en" href="https://wintrover.github.io/en/"/><link rel="alternate" hreflang="x-default" href="https://wintrover.github.io/"/><script>(()=>{const lang=(navigator.language||"").toLowerCase().startsWith("ko")?"ko":"en";location.replace("/"+lang+"/");})();</script></head><body><noscript><a href="/ko/" lang="ko">한국어</a> <a href="/en/" lang="en">English</a></noscript></body></html>';
	writeFile(path.join(dist, "index.html"), selectorHtml);

	buildBlog(dist, "ko");
	buildBlog(dist, "en");
}

main();
