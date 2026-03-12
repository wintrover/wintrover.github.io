import path from "node:path";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	process.env.VITE_LOCALE ??= "en";
	process.env.VITE_HTML_LANG ??= process.env.VITE_LOCALE;

	return {
		plugins: [
			svelte({
				preprocess: vitePreprocess({ script: true }),
				emitCss: mode !== "test",
			}),
		],
		resolve: {
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
		server: {
			historyApiFallback: true,
		},
		preview: {
			historyApiFallback: true,
		},
	};
});
