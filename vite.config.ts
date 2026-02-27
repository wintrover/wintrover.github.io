import path from "node:path";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
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
	base: "/blog/",
	build: {
		outDir: "dist",
		copyPublicDir: true,
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
				lines: 0,
				functions: 0,
				branches: 0,
				statements: 0,
			},
		},
		deps: {
			inline: ["svelte-spa-router"],
		},
		ssr: {
			noExternal: ["svelte-spa-router"],
		},
		env: {
			BASE_URL: "/blog/",
		},
	},
	server: {
		historyApiFallback: true,
	},
	preview: {
		historyApiFallback: true,
	},
}));
