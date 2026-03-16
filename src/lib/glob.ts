import type { Locale } from "./locale";

type PostFiles = Record<string, string | null>;

const rawLocale = (import.meta.env.VITE_LOCALE ?? "en") as string;
const locale: Locale = rawLocale === "ko" ? "ko" : "en";

const postFiles: PostFiles =
	locale === "ko"
		? import.meta.glob("../posts/ko/**/*.md", {
				eager: true,
				query: "?raw",
				import: "default",
			})
		: import.meta.glob(["../posts/**/*.md", "!../posts/ko/**/*.md"], {
				eager: true,
				query: "?raw",
				import: "default",
			});

export async function getPostFiles(): Promise<PostFiles> {
	const envLocale = import.meta.env.VITE_LOCALE;

	if (envLocale === "ko" || envLocale === "en") return postFiles;

	if (import.meta.env.DEV && typeof window !== "undefined") {
		const mod = await import("./glob.dev");
		return mod.getPostFilesDev(window.location.pathname);
	}

	return postFiles;
}
