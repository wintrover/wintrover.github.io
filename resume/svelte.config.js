import adapter from "@sveltejs/adapter-static";

function normalizeBasePath(path) {
	const raw = String(path ?? "").trim();
	if (!raw) return "";
	const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
	return withLeadingSlash.replace(/\/+$/, "");
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "index.html",
			precompress: false,
			strict: false,
		}),
		paths: {
			base: process.argv.includes("dev")
				? ""
				: normalizeBasePath(process.env.BASE_PATH ?? "/resume"),
		},
		prerender: {
			entries: ["*"],
		},
	},
};

export default config;
