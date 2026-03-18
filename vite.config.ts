import path from "node:path";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { getBlogBuildMeta } from "./src/lib/config";

export default defineConfig(({ mode }) => {
	const defaultLocale =
		mode === "test" ? "en" : mode === "production" ? "en" : "auto";
	process.env.VITE_LOCALE ??= defaultLocale;
	process.env.VITE_HTML_LANG ??=
		process.env.VITE_LOCALE === "auto" ? "en" : process.env.VITE_LOCALE;
	const metaLocale = process.env.VITE_LOCALE === "ko" ? "ko" : "en";
	const meta = getBlogBuildMeta(metaLocale);
	process.env.VITE_META_DESCRIPTION ??= meta.metaDescription;
	process.env.VITE_OG_TITLE ??= meta.ogTitle;
	process.env.VITE_OG_DESCRIPTION ??= process.env.VITE_META_DESCRIPTION;
	process.env.VITE_OG_IMAGE_ALT ??= meta.ogImageAlt;
	process.env.VITE_CANONICAL_PATH ??=
		process.env.VITE_LOCALE === "ko" ? "/ko/" : "/";
	process.env.VITE_GA_MEASUREMENT_ID ??= "";
	process.env.VITE_GOOGLE_SITE_VERIFICATION ??= "";

	return {
		plugins: [
			svelte({
				configFile: false,
				preprocess: vitePreprocess({ script: true }),
				emitCss: mode !== "test",
			}),
		],
		resolve: {
			conditions: mode === "test" ? ["browser"] : undefined,
			alias: {
				"svelte-spa-router": path.resolve(
					__dirname,
					"node_modules/svelte-spa-router",
				),
			},
		},
		base: process.env.VITE_BASE_PATH ?? "/",
		build: {
			outDir: process.env.VITE_OUT_DIR ?? "dist",
			copyPublicDir: true,
			chunkSizeWarningLimit: 900,
			rollupOptions: {
				output: {
					manualChunks: undefined,
				},
			},
		},
		assetsInclude: ["**/*.md"],
		publicDir: "public",
		test: {
			globals: true,
			environment: "jsdom",
			setupFiles: ["tests/setup.ts"],
			include: ["tests/**/*.test.ts"],
			pool: "threads",
			coverage: {
				provider: "istanbul",
				include: [
					"src/lib/utils.ts",
					"src/lib/postLoader.ts",
					"src/lib/markdown.ts",
				],
				exclude: [
					"src/main.ts",
					"src/posts/**/*.md",
					"src/templates/**/*.md",
					"src/lib/giscus-config.ts",
				],
				reporter: ["text", "json", "html"],
				all: true,
				thresholds: {
					lines: 100,
					functions: 100,
					branches: 100,
					statements: 100,
				},
			},
			deps: {
				inline: ["svelte-spa-router"],
			},
			ssr: {
				noExternal: ["svelte-spa-router"],
			},
			env: {
				BASE_URL: "/",
			},
		},
		ssr: mode === "test" ? { resolve: { conditions: ["browser"] } } : undefined,
		server: {
			historyApiFallback: true,
		},
		preview: {
			historyApiFallback: true,
		},
	};
});
