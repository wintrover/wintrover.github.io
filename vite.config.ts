import path from "node:path";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const defaultLocale =
		mode === "test" ? "en" : mode === "production" ? "en" : "auto";
	process.env.VITE_LOCALE ??= defaultLocale;
	process.env.VITE_HTML_LANG ??=
		process.env.VITE_LOCALE === "auto" ? "en" : process.env.VITE_LOCALE;
	const metaLocale = process.env.VITE_LOCALE === "ko" ? "ko" : "en";
	process.env.VITE_META_DESCRIPTION ??=
		metaLocale === "ko"
			? "wintrover의 프로덕트 개발 블로그와 이력서. AI/LLM, 컴퓨터 비전, 프로덕트 엔지니어링 기록."
			: "wintrover's blog and resume. Notes on building products with AI/LLM and computer vision.";
	process.env.VITE_OG_TITLE ??= "wintrover - Product Engineer & Builder";
	process.env.VITE_OG_DESCRIPTION ??= process.env.VITE_META_DESCRIPTION;
	process.env.VITE_OG_IMAGE_ALT ??=
		metaLocale === "ko" ? "wintrover 프로필 이미지" : "wintrover profile image";

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
				include: ["src/**/*.ts", "src/**/*.svelte"],
				exclude: [
					"src/main.ts",
					"src/posts/**/*.md",
					"src/templates/**/*.md",
					"src/lib/giscus-config.ts",
				],
				reporter: ["text", "json", "html"],
				all: true,
				thresholds: {
					lines: 90,
					functions: 80,
					branches: 80,
					statements: 90,
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
