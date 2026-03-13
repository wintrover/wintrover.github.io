import type { Post } from "./postLoader";

type RuntimeEnv = {
	BASE_URL?: unknown;
};

type WintrGlobal = typeof globalThis & {
	__WINTR_BASE_URL__?: unknown;
	__WINTR_ENV_BASE_URL__?: unknown;
	__WINTR_IMPORT_META_ENV__?: RuntimeEnv;
	process?: {
		env?: RuntimeEnv;
	};
};

type ImportMetaWithEnv = ImportMeta & {
	env?: RuntimeEnv;
};

export function getBaseUrl() {
	const withTrailingSlash = (s: string) => (s.endsWith("/") ? s : `${s}/`);
	const globals = globalThis as WintrGlobal;

	const fromGlobal = globals.__WINTR_BASE_URL__;
	if (typeof fromGlobal === "string" && fromGlobal.length > 0)
		return withTrailingSlash(fromGlobal);

	const envOverride = globals.__WINTR_ENV_BASE_URL__;
	if (typeof envOverride === "string" && envOverride.length > 0)
		return withTrailingSlash(envOverride);

	const baseFromProcess = globals.process?.env?.BASE_URL;
	if (typeof baseFromProcess === "string" && baseFromProcess.length > 0)
		return withTrailingSlash(baseFromProcess);

	const hasGlobalMetaEnv = Object.hasOwn(globals, "__WINTR_IMPORT_META_ENV__");
	const metaEnv = hasGlobalMetaEnv
		? globals.__WINTR_IMPORT_META_ENV__
		: (import.meta as ImportMetaWithEnv).env;
	const baseFromEnv = metaEnv?.BASE_URL;
	if (typeof baseFromEnv === "string" && baseFromEnv.length > 0)
		return withTrailingSlash(baseFromEnv);

	return withTrailingSlash("/");
}

const baseUrl = getBaseUrl();

export const siteOrigin = "https://wintrover.github.io";
export const defaultOgImage = `${siteOrigin}/images/profile.png`;
export const blogDefaultSeo = {
	title: "wintrover - Product Engineer & Builder",
	description: {
		ko: "wintrover의 프로덕트 개발 블로그. AI/LLM, 컴퓨터 비전, 제품 만들기 기록.",
		en: "wintrover's product engineering blog. Notes on AI/LLM, computer vision, and building products.",
	},
};

export function buildPostDetailSeo(args: {
	post: Post | null;
	loading: boolean;
	slug: string;
	resolvedLocale: "ko" | "en";
}) {
	const { post, loading, slug, resolvedLocale } = args;
	const origin = getRuntimeOrigin();

	if (post) {
		const seoTitle = `${post.title} - wintrover`;
		const seoDescription = post.excerpt || post.title;
		const canonicalUrl = slug
			? `${origin}/${resolvedLocale}/post/${slug}/`
			: `${origin}/${resolvedLocale}/`;
		return {
			seoTitle,
			seoDescription,
			canonicalUrl,
			structuredData: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: post.title,
				image: [defaultOgImage],
				datePublished: post.date,
				dateModified: post.date,
				author: {
					"@type": "Person",
					name: "wintrover",
					url: `${origin}/`,
				},
				description: seoDescription,
				mainEntityOfPage: canonicalUrl,
			}),
		};
	}

	if (!loading) {
		return {
			seoTitle: "Post not found - wintrover",
			seoDescription:
				"The post you're looking for doesn't exist or has been moved.",
			canonicalUrl: `${origin}/${resolvedLocale}/`,
			structuredData: "",
		};
	}

	return {
		seoTitle: "Loading post - wintrover",
		seoDescription: "",
		canonicalUrl: `${origin}/${resolvedLocale}/`,
		structuredData: "",
	};
}

export function getRuntimeOrigin() {
	if (typeof window === "undefined") return siteOrigin;
	return import.meta.env.PROD ? siteOrigin : window.location.origin;
}

export const siteConfig = {
	name: "wintrover",
	description: "Product Engineer & Builder",
	avatar: `${baseUrl}images/profile.png`,
	baseUrl,
	origin: siteOrigin,
	defaultOgImage,
	social: {
		email: "wintrover@gmail.com",
		github: "wintrover",
		instagram: "wintrover",
		linkedin: "suhyok-yun-1934b713a",
	},
};
