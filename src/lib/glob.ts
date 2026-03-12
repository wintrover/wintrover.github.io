const locale = ((import.meta as any)?.env?.VITE_LOCALE ?? "en") as "ko" | "en";

export const postFiles =
	locale === "ko"
		? (import.meta.glob("../posts/ko/**/*.md", {
				eager: true,
				query: "?raw",
				import: "default",
			}) as Record<string, string>)
		: (import.meta.glob(["../posts/**/*.md", "!../posts/ko/**/*.md"], {
				eager: true,
				query: "?raw",
				import: "default",
			}) as Record<string, string>);
