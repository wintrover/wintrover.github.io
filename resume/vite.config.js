import { sveltekit } from "@sveltejs/kit/vite";
import {
	defaultClientConditions,
	defaultServerConditions,
	defineConfig,
} from "vite";

export default defineConfig(() => {
	const isVitest = Boolean(process.env.VITEST);

	return {
		plugins: [sveltekit()],
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("/node_modules/svelte/")) return "svelte";
					},
				},
			},
		},
		ssr: isVitest
			? {
					resolve: {
						conditions: ["browser", ...defaultServerConditions],
						externalConditions: ["browser", "node"],
					},
				}
			: undefined,
		resolve: isVitest
			? {
					conditions: ["browser", ...defaultClientConditions],
				}
			: undefined,
		server: {
			port: 3000,
		},
		test: {
			environment: "jsdom",
			setupFiles: ["./vitest.setup.js"],
			server: {
				deps: {
					inline: ["svelte"],
				},
			},
			coverage: {
				provider: "v8",
				reporter: ["text", "json-summary", "html"],
				include: ["src/**/*.{js,ts,svelte}"],
				exclude: ["src/**/*.d.ts", "src/**/*.css", "src/**/*.html"],
				thresholds: {
					lines: 100,
					functions: 100,
					branches: 100,
					statements: 100,
				},
			},
		},
	};
});
