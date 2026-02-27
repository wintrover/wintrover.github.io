export const postFiles = import.meta.glob("../posts/**/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;
