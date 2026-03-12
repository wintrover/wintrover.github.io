import { detectLocale } from "./locale";

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

export function getPostFilesDev(pathname: string): PostFiles {
	const locale = detectLocale({
		pathname,
		navigatorLanguage: navigator.language,
	});
	return locale === "ko" ? koPostFiles : enPostFiles;
}
