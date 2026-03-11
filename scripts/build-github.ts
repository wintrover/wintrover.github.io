import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Env = Record<string, string | undefined>;

function run(cmd: string, args: string[], env: Env = {}) {
	execFileSync(cmd, args, {
		stdio: "inherit",
		env: { ...process.env, ...env },
	});
}

function rm(target: string) {
	fs.rmSync(target, { recursive: true, force: true });
}

function mk(target: string) {
	fs.mkdirSync(target, { recursive: true });
}

function copyDir(src: string, dst: string) {
	rm(dst);
	mk(dst);
	fs.cpSync(src, dst, { recursive: true });
}

function writeFile(target: string, content: string) {
	mk(path.dirname(target));
	fs.writeFileSync(target, content);
}

function buildBlog(dist: string, locale: "ko" | "en") {
	const basePath = `/${locale}/`;
	run("npx", ["vite", "build"], {
		VITE_BASE_PATH: basePath,
		VITE_OUT_DIR: path.join(dist, locale),
		VITE_LOCALE: locale,
		VITE_HTML_LANG: locale,
	});
}

function buildResume(dist: string, locale: "ko" | "en") {
	const basePath = `/${locale}/resume`;
	run("npm", ["--prefix", "resume", "run", "build"], {
		BASE_PATH: basePath,
		PUBLIC_DEFAULT_LOCALE: locale,
	});
	copyDir(
		path.join(process.cwd(), "resume", "build"),
		path.join(dist, locale, "resume"),
	);
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
		'<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>wintrover</title><meta name="robots" content="index,follow"/><link rel="alternate" hreflang="ko" href="https://wintrover.github.io/ko/"/><link rel="alternate" hreflang="en" href="https://wintrover.github.io/en/"/><link rel="alternate" hreflang="x-default" href="https://wintrover.github.io/"/><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:40px;line-height:1.5}main{max-width:720px;margin:0 auto}a{display:inline-block;margin-right:12px;padding:10px 14px;border:1px solid #ddd;border-radius:8px;text-decoration:none;color:#111}a:hover{border-color:#999}</style></head><body><main><h1>wintrover</h1><p>Select a language.</p><p><a href="/ko/" lang="ko">한국어</a><a href="/en/" lang="en">English</a></p><script>(()=>{const lang=(navigator.language||"").toLowerCase().startsWith("ko")?"ko":"en";const target="/"+lang+"/";if(location.pathname==="/"&&location.search===""&&location.hash===""){setTimeout(()=>{location.replace(target);},50);}})();</script></main></body></html>';
	writeFile(path.join(dist, "index.html"), selectorHtml);

	buildBlog(dist, "ko");
	buildBlog(dist, "en");

	buildResume(dist, "ko");
	buildResume(dist, "en");
}

main();
