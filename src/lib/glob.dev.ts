type PostFiles = Record<string, string | null>;

const koPostFiles: PostFiles = import.meta.glob("../posts/ko/**/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
});

const enPostFiles: PostFiles = import.meta.glob(
	["../posts/**/*.md", "!../posts/ko/**/*.md"],
	{
		eager: true,
		query: "?raw",
		import: "default",
	},
);

function detectLocaleFromPath(pathname: string): "ko" | "en" | null {
	const match = pathname.match(/^\/(ko|en)(\/|$)/);
	if (!match) return null;
	return match[1] as "ko" | "en";
}

function detectLocaleFromNavigator(): "ko" | "en" {
	const language = (navigator.language ?? "").toLowerCase();
	return language.startsWith("ko") ? "ko" : "en";
}

export function getPostFilesDev(pathname: string): PostFiles {
	const fromPath = detectLocaleFromPath(pathname);
	const locale = fromPath ?? detectLocaleFromNavigator();
	return locale === "ko" ? koPostFiles : enPostFiles;
}
